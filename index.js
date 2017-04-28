import Btn from './components/btn';

import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

const styles = StyleSheet.create({
  slideOutContainer: {
    position: 'absolute',
    top: 0, bottom: 0,
    left: 0, right: 0,
    overflow: 'hidden',
  },
  btnsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
});

// Position of the left of the swipable item when closed
const CLOSED_LEFT_POSITION = 0;
// Minimum swipe distance before we recognize it as such
const HORIZONTAL_SWIPE_DISTANCE_THRESHOLD = 10;
// Minimum swipe speed before we fully animate the user's action (open/close)
const HORIZONTAL_FULL_SWIPE_SPEED_THRESHOLD = 0.3;
// Factor to divide by to get slow speed; i.e. 4 means 1/4 of full speed
const SLOW_SPEED_SWIPE_FACTOR = 4;
// Time, in milliseconds, of how long the animated swipe should be
const SWIPE_DURATION = 300;

/**
 * On SwipeableListView mount, the 1st item will bounce to show users it's
 * possible to swipe
 */
const ON_MOUNT_BOUNCE_DELAY = 700;
const ON_MOUNT_BOUNCE_DURATION = 400;

// Distance left of closed position to bounce back when right-swiping from closed
const RIGHT_SWIPE_BOUNCE_BACK_DISTANCE = 30;
const RIGHT_SWIPE_BOUNCE_BACK_DURATION = 300;
/**
 * Max distance of right swipe to allow (right swipes do functionally nothing).
 * Must be multiplied by SLOW_SPEED_SWIPE_FACTOR because gestureState.dx tracks
 * how far the finger swipes, and not the actual animation distance.
*/
const RIGHT_SWIPE_THRESHOLD = 30 * SLOW_SPEED_SWIPE_FACTOR;

class SwipeableView extends Component {

  static propTypes = {
    children: PropTypes.any,
    isOpen: PropTypes.bool,
    onOpen: PropTypes.func,
    onClose: PropTypes.func,
    onSwipeEnd: PropTypes.func,
    onSwipeStart: PropTypes.func,
    autoClose: PropTypes.bool,
    // Should bounce the row on mount
    shouldBounceOnMount: PropTypes.bool,
    /**
     * A ReactElement that is unveiled when the user swipes
     */
    btnsArray: PropTypes.array.isRequired,
    /**
     * The minimum swipe distance required before fully animating the swipe. If
     * the user swipes less than this distance, the item will return to its
     * previous (open/close) position.
     */
    swipeThreshold: PropTypes.number,
    /**
     * True/false if the current language is right to left
     */
    isRTL: PropTypes.bool,
  };

  static defaultProps = {
    isOpen: false,
    onOpen: () => {},
    onClose: () => {},
    onSwipeEnd: () => {},
    onSwipeStart: () => {},
    swipeThreshold: 30,
    shouldBounceOnMount: false,
    autoClose: false,
    isRTL: false,
  };

  constructor(props) {
    super(props);

    this._panResponder = {};

    this._previousLeft = CLOSED_LEFT_POSITION;

    this.state = {
      btnWidthDefault: 0,
      btnWidths: [],
      width: 0,
      height: 0,
      currentLeft: new Animated.Value(this._previousLeft),
      /**
       * In order to render component A beneath component B, A must be rendered
       * before B. However, this will cause "flickering", aka we see A briefly
       * then B. To counter this, _isSwipeableViewRendered flag is used to set
       * component A to be transparent until component B is loaded.
       */
      isSwipeableViewRendered: false,
      rowHeight: null,
      maxSwipeDistance: 0,
    };

    this._swipeoutRef = null;
  }

  componentWillMount() {
    this._panResponder = PanResponder.create({
      onMoveShouldSetPanResponderCapture: this._handleMoveShouldSetPanResponderCapture.bind(this),
      onPanResponderGrant: this._handlePanResponderGrant.bind(this),
      onPanResponderMove: this._handlePanResponderMove.bind(this),
      onPanResponderRelease: this._handlePanResponderEnd.bind(this),
      onPanResponderTerminationRequest: this._onPanResponderTerminationRequest.bind(this),
      onPanResponderTerminate: this._handlePanResponderEnd.bind(this),
      onShouldBlockNativeResponder: () => false,
    });
  }

  componentDidMount() {
    const { shouldBounceOnMount } = this.props;

    if (shouldBounceOnMount) {
      /**
       * Do the on mount bounce after a delay because if we animate when other
       * components are loading, the animation will be laggy
       */
      this._timeout = setTimeout(() => {
        this._animateBounceBack(ON_MOUNT_BOUNCE_DURATION);
      }, ON_MOUNT_BOUNCE_DELAY);
    }

    setTimeout(this._measureSwipeout.bind(this));
  }

  componentWillUnmount() {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { isOpen } = this.props;
    /**
     * We do not need an "animateOpen(noCallback)" because this animation is
     * handled internally by this component.
     */
    if (isOpen && !nextProps.isOpen) {
      this._animateToClosedPosition();
    }
  }

  shouldComponentUpdate(nextProps) {
    const { shouldBounceOnMount } = this.props;

    if (shouldBounceOnMount && !nextProps.shouldBounceOnMount) {
      // No need to rerender if SwipeableListView is disabling the bounce flag
      return false;
    }

    return true;
  }

  _onPanResponderTerminationRequest() {
    return false;
  }

  _animateTo(toValue, duration = SWIPE_DURATION, callback = () => {}) {
    Animated.timing(
      this.state.currentLeft,
      {
        duration,
        toValue,
      },
    ).start(() => {
      this._previousLeft = toValue;
      callback();
    });
  }

  _animateToClosedPosition(duration = SWIPE_DURATION) {
    this._animateTo(CLOSED_LEFT_POSITION, duration);
  }

  _animateToClosedPositionDuringBounce() {
    this._animateToClosedPosition(RIGHT_SWIPE_BOUNCE_BACK_DURATION);
  }

  _animateToOpenPosition() {
    const { isRTL } = this.props;
    const { maxSwipeDistance } = this.state;
    this._animateTo(isRTL ? maxSwipeDistance : -maxSwipeDistance);
  }

  _animateToOpenPositionWith(speed, distMoved) {
    const { isRTL } = this.props;
    const { maxSwipeDistance } = this.state;
    /**
     * Ensure the speed is at least the set speed threshold to prevent a slow
     * swiping animation
     */
    speed = (
      speed > HORIZONTAL_FULL_SWIPE_SPEED_THRESHOLD ?
      speed :
      HORIZONTAL_FULL_SWIPE_SPEED_THRESHOLD
    );
    /**
     * Calculate the duration the row should take to swipe the remaining distance
     * at the same speed the user swiped (or the speed threshold)
     */
    const duration = Math.abs((maxSwipeDistance - Math.abs(distMoved)) / speed);
    this._animateTo(isRTL ? maxSwipeDistance : -maxSwipeDistance, duration);
  }

  _animateBounceBack(duration) {
    /**
     * When swiping right, we want to bounce back past closed position on release
     * so users know they should swipe right to get content.
     */
    const { isRTL } = this.props;
    const swipeBounceBackDistance = isRTL ?
      -RIGHT_SWIPE_BOUNCE_BACK_DISTANCE :
      RIGHT_SWIPE_BOUNCE_BACK_DISTANCE;
    this._animateTo(
      -swipeBounceBackDistance,
      duration,
      this._animateToClosedPositionDuringBounce.bind(this),
    );
  }

  _shouldAnimateRemainder(gestureState) {
    /**
     * If user has swiped past a certain distance, animate the rest of the way
     * if they let go
     */
    return (
      Math.abs(gestureState.dx) > this.props.swipeThreshold ||
      gestureState.vx > HORIZONTAL_FULL_SWIPE_SPEED_THRESHOLD
    );
  }

  _handlePanResponderEnd(event, gestureState) {
    const { onOpen, onClose, onSwipeEnd, isRTL } = this.props;
    const horizontalDistance = isRTL ? -gestureState.dx : gestureState.dx;

    if (this._isSwipingRightFromClosed(gestureState)) {
      onOpen && onOpen();
      this._animateBounceBack(RIGHT_SWIPE_BOUNCE_BACK_DURATION);
    } else if (this._shouldAnimateRemainder(gestureState)) {
      if (horizontalDistance < 0) {
        // Swiped left
        onOpen && onOpen();
        this._animateToOpenPositionWith(gestureState.vx, horizontalDistance);
      } else {
        // Swiped right
        onClose && onClose();
        this._animateToClosedPosition();
      }
    } else {
      if (this._previousLeft === CLOSED_LEFT_POSITION) {
        this._animateToClosedPosition();
      } else {
        this._animateToOpenPosition();
      }
    }

    onSwipeEnd && onSwipeEnd();
  }

  _swipeFullSpeed(gestureState) {
    this.state.currentLeft.setValue(this._previousLeft + gestureState.dx);
  }

  _swipeSlowSpeed(gestureState) {
    this.state.currentLeft.setValue(
      this._previousLeft + gestureState.dx / SLOW_SPEED_SWIPE_FACTOR
    );
  }

  _isSwipingRightFromClosed(gestureState) {
    const { isRTL } = this.props;
    const gestureStateDx = isRTL ? -gestureState.dx : gestureState.dx;
    return this._previousLeft === CLOSED_LEFT_POSITION && gestureStateDx > 0;
  }

  _isSwipingExcessivelyRightFromClosedPosition(gestureState) {
    /**
     * We want to allow a BIT of right swipe, to allow users to know that
     * swiping is available, but swiping right does not do anything
     * functionally.
     */
    const { isRTL } = this.props;
    const gestureStateDx = isRTL ? -gestureState.dx : gestureState.dx;
    return (
      this._isSwipingRightFromClosed(gestureState) &&
      gestureStateDx > RIGHT_SWIPE_THRESHOLD
    );
  }

  _handlePanResponderMove(event, gestureState) {
    const { onSwipeStart } = this.props;

    if (this._isSwipingExcessivelyRightFromClosedPosition(gestureState)) {
      return;
    }

    onSwipeStart && onSwipeStart();

    if (this._isSwipingRightFromClosed(gestureState)) {
      this._swipeSlowSpeed(gestureState);
    } else {
      this._swipeFullSpeed(gestureState);
    }
  }

  _handlePanResponderGrant() {
  }

  _handleMoveShouldSetPanResponderCapture(event, gestureState) {
    // Decides whether a swipe is responded to by this component or its child
    return gestureState.dy < 10 && this._isValidSwipe(gestureState);
  }

  _isValidSwipe(gestureState) {
    return Math.abs(gestureState.dx) > HORIZONTAL_SWIPE_DISTANCE_THRESHOLD;
  }

  _btnWidth(btn) {
    const hasCustomWidth = btn.props && btn.props.style && btn.props.style.width;
    return hasCustomWidth ? btn.props.style.width : false;
  }

  _btnsWidthTotal(width, group) {
    const customWidths = [];

    group && group.forEach(btn => {
      this._btnWidth(btn) ? customWidths.push(this._btnWidth(btn)) : null;
    });

    const customWidthTotal = customWidths.reduce((a, b) => a + b, 0);
    const defaultWidth = (width - customWidthTotal) / (5 - customWidths.length);
    const defaultWidthsTotal = ((group ? group.length : 0) - customWidths.length) * defaultWidth;

    this.setState({
      btnWidthDefault: defaultWidth,
    });

    return customWidthTotal + defaultWidthsTotal;
  }

  _setBtnsWidth(btns) {
    const { btnWidthDefault } = this.state;
    const btnWidths = [];

    btns && btns.forEach(btn => {
      btnWidths.push(this._btnWidth(btn) ? this._btnWidth(btn) : btnWidthDefault);
    });

    this.setState({
      btnWidths,
    });
  }

  _handleBtnPress(btn) {
    const { autoClose } = this.props;

    if (btn) {
      btn.onPress && btn.onPress();
      (btn.autoClose || autoClose) && this._animateToClosedPosition();
    }
  }

  _measureSwipeout() {
    if (this._swipeoutRef) {
      this._swipeoutRef.measure((a, b, width, height) => {
        const { btnsArray } = this.props;

        this.setState({
          height: height,
          width: width,
          maxSwipeDistance: this._btnsWidthTotal(width, btnsArray),
        });

        this._setBtnsWidth(btnsArray);
      });
    }
  }

  _returnBtnDimensions() {
    const { height, width } = this.state;

    return {
      height: height,
      width: width,
    };
  }

  _onSwipeableViewLayout(event) {
    this.setState({
      isSwipeableViewRendered: true,
      rowHeight: event.nativeEvent.layout.height,
    });
  }

  _renderSlideoutBtns() {
    const { btnWidths } = this.state;

    if (btnWidths.length <= 0) {
      return false;
    }

    return this.props.btnsArray.map((btn, i) => {
      const btnProps = btn.props ? btn.props : [];

      return (
        <Btn
          key={i}
          panDimensions={{ width: btnWidths[i], height: this.state.rowHeight }}
          text={btn.text}
          type={btn.type}
          component={btn.component}
          {...btnProps}
          onPress={() => this._handleBtnPress(btn)}/>
      );
    });
  }

  render() {
    const { isRTL } = this.props;
    // The view hidden behind the main view
    let btnsArray;
    if (this.state.isSwipeableViewRendered && this.state.rowHeight) {
      btnsArray = (
        <View style={[styles.slideOutContainer, { height: this.state.rowHeight }]}>
          <View style={[ styles.btnsContainer, isRTL ? { justifyContent: 'flex-start' } : { justifyContent: 'flex-end' } ]}>
            { this._renderSlideoutBtns() }
          </View>
        </View>
      );
    }

    // The swipeable item
    const swipeableView = (
      <Animated.View
        onLayout={this._onSwipeableViewLayout.bind(this)}
        style={{transform: [{translateX: this.state.currentLeft}], backgroundColor: 'white'}}>
        {this.props.children}
      </Animated.View>
    );

    return (
      <View
        ref={ (ref) => (this._swipeoutRef = ref) }
        {...this._panResponder.panHandlers}>
        {btnsArray}
        {swipeableView}
      </View>
    );
  }

}

module.exports = SwipeableView;
