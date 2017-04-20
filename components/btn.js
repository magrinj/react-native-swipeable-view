import NativeButton from './NativeButton';

import React, {
  Component,
  PropTypes,
} from 'react';

import {
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#b6bec0',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnDanger: {
    backgroundColor: '#FF3B30',
  },
  btnPrimary: {
    backgroundColor: '#006fff',
  },
  btnSecondary: {
    backgroundColor: '#fd9427',
  },
  btnSuccess: {
    backgroundColor: '#4cd965',
  },
  btnText: {
    color: '#fff',
  },
});

class Btn extends Component {

  static propTypes = {
    ...TouchableWithoutFeedback.propTypes,
    textStyle: Text.propTypes.style,
    disabledStyle: Text.propTypes.style,
    underlayColor: PropTypes.string,
    background: (TouchableNativeFeedback.propTypes) ? TouchableNativeFeedback.propTypes.background : PropTypes.any,
    panDimensions: PropTypes.object.isRequired,
    component: PropTypes.node,
    text: PropTypes.string,
    type: PropTypes.string,
  };

  static defaultProps = {
    component: null,
    text: 'Click Me',
    type: null,
  };

  setTypeStyle() {
    const { type } = this.props;

    switch (type) {
      case 'danger':
      case 'delete':
        return styles.btnDanger;
      case 'primary':
        return styles.btnPrimary;
      case 'secondary':
        return styles.btnSecondary;
      case 'success':
        return styles.btnSuccess;
      default:
        return {};
    }
  }

  render() {
    const { panDimensions, style, text, component, type, ...btnProps } = this.props;

    // unused, but remove from btnProps
    type;

    return (
      <View style={ [ panDimensions ] }>
        <NativeButton
          style={ [ styles.btn, this.setTypeStyle(), style ] }
          textStyle={ styles.btnText }
          {...btnProps}>
          {
            component ? component : text
          }
        </NativeButton>
      </View>
    );
  }
}

export default Btn;
