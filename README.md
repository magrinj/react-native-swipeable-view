# react-native-swipeable-view

> **This library is deprecated and no longer maintained.** Please use one of the actively maintained alternatives below.

## Alternatives

- **[react-native-gesture-handler Swipeable](https://docs.swmansion.com/react-native-gesture-handler/docs/components/swipeable/)** - Built-in `Swipeable` component from react-native-gesture-handler, the standard for gesture handling in React Native.
- **[react-native-reanimated-swipeable](https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/)** - Reanimated-based version with smoother animations, compatible with Fabric/New Architecture.
- **[react-native-swipe-list-view](https://github.com/jemise111/react-native-swipe-list-view)** - Feature-rich swipeable list rows with hidden action buttons.

---

<details>
<summary>Original README (archived)</summary>

This library allow you to create swipeable component, by exemple for a row in a list view, or anywhere you want.
The code is based on the experimental SwipeableListView of react-native.

![swipe](https://cloud.githubusercontent.com/assets/3551795/25225308/45494d9a-25c1-11e7-830f-defea7a8262d.gif)

## Installation

```
npm install --save react-native-swipeable-view
```

## Usage example

```
import SwipeableView from 'react-native-swipeable-view';

// Buttons
var btnsArray = [
  {
    text: 'Button',
  },
];

// SwipeableView component
<SwipeableView btnsArray={ btnsArray }>
  <View>
    <Text>Swipe me left</Text>
  </View>
</SwipeableView>

```

## Props

Prop                | Type   | Optional | Default   | Description
------------------- | ------ | -------- | --------- | -----------
isOpen              | bool   | Yes      | false     | Swipeout is open or not
autoClose           | bool   | Yes      | false     | Auto-Close on button press
btnsArray           | array  | No       | []        | Swipe buttons array
onOpen              | func   | Yes      |           | Callback when swipe is opened
onClose             | func   | Yes      |           | Callback when swipe is closed
onSwipeStart        | func   | Yes      |           | Callback when swipe start
onSwipeEnd          | func   | Yes      |           | Callback when swipe end
shouldBounceOnMount | bool   | Yes      | false     | Bounce component on mount
swipeThreshold      | number | Yes      | 30        | The minimum swipe distance required before fully animating the swipe
isRTL               | bool   | Yes      | false     | True/false if the current language is right to left

##### Button props

Prop            | Type   | Optional | Default   | Description
--------------- | ------ | -------- | --------- | -----------
props           | object | Yes      |           | Pass custom props to button component
component       | string | Yes      | null      | Pass custom component to button
onPress         | func   | Yes      | null      | Function executed onPress
text            | string | Yes      | 'Click Me'| Text
type            | string | Yes      | 'default' | Default, primary, secondary

</details>
