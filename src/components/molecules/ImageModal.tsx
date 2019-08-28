import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Image, Dimensions, ImageStyle, ViewStyle } from 'react-native'
import { PinchGestureHandler, State } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
const { Value, event, block, set, cond, eq, lessOrEq, add, sub, multiply, divide } = Animated

function useImageSizeStyle(thumbnailUri?: string): ImageStyle {
  // width / height
  const [aspect, setAspect] = useState(1)

  useEffect(() => {
    if (thumbnailUri == null) return
    Image.getSize(thumbnailUri, (w, h) => setAspect(w / h), () => {})
  }, [thumbnailUri])

  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen')
  const screenAspect = screenWidth / screenHeight
  return aspect > screenAspect
    ? {
        width: screenWidth,
        height: screenWidth / aspect,
      }
    : {
        width: screenHeight * aspect,
        height: screenHeight,
      }
}

function usePinchGesture() {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen')

  const { current: scale } = useRef(new Value(1))
  const { current: baseScale } = useRef(new Value(1))

  const { current: originX } = useRef(new Value(0))
  const { current: originY } = useRef(new Value(0))
  const { current: baseOriginX } = useRef(new Value(0))
  const { current: baseOriginY } = useRef(new Value(0))

  const handlePinch = useMemo(
    () =>
      event([
        {
          nativeEvent: ({
            state,
            scale: curScale,
            focalX,
            focalY,
          }: {
            state: State
            scale: number
            focalX: number
            focalY: number
          }) => {
            const x = sub(focalX, screenWidth / 2)
            const y = sub(focalY, screenHeight / 2)
            const newOriginX = add(divide(sub(x, baseOriginX), scale), baseOriginX)
            const newOriginY = add(divide(sub(y, baseOriginY), scale), baseOriginY)

            return block([
              cond(eq(state, State.ACTIVE), [
                set(scale, multiply(curScale, baseScale)),
                cond(lessOrEq(scale, 1), [], [set(originX, newOriginX), set(originY, newOriginY)]),
              ]),
              cond(eq(state, State.END), [
                cond(
                  lessOrEq(scale, 1),
                  [
                    set(scale, 1),
                    set(baseScale, 1),
                    set(originX, 0),
                    set(originY, 0),
                    set(baseOriginX, 0),
                    set(baseOriginY, 0),
                  ],
                  [
                    set(baseScale, multiply(curScale, baseScale)),
                    set(baseOriginX, newOriginX),
                    set(baseOriginY, newOriginY),
                  ],
                ),
              ]),
            ])
          },
        },
      ]),
    [],
  )

  const viewTransformStyle: ViewStyle = {
    transform: [{ translateX: originX as any, translateY: originY as any }, { scale: scale as any }],
  }

  const imageTransformStyle: ImageStyle = useMemo(
    () => ({
      transform: [{ translateX: multiply(-1, originX) as any, translateY: multiply(-1, originY) as any }],
    }),
    [],
  )

  return {
    handlePinch,
    viewTransformStyle,
    imageTransformStyle,
  }
}

export const ImageModal: React.FC<{ style?: ImageStyle; imageUri?: string; thumbnailUri?: string }> = React.memo(
  ({ style, imageUri, thumbnailUri }) => {
    const imageSizeStyle = useImageSizeStyle(thumbnailUri)
    const { handlePinch, viewTransformStyle, imageTransformStyle } = usePinchGesture()
    const { width: screenWidth, height: screenHeight } = Dimensions.get('screen')

    return (
      <PinchGestureHandler onGestureEvent={handlePinch} onHandlerStateChange={handlePinch}>
        <Animated.View
          style={[style, { width: screenWidth, height: screenHeight, justifyContent: 'center', alignItems: 'center' }]}
          collapsable={false}
        >
          <Animated.View style={[imageSizeStyle, viewTransformStyle]}>
            <Animated.Image style={[imageSizeStyle, imageTransformStyle]} source={{ uri: imageUri }} />
          </Animated.View>
        </Animated.View>
      </PinchGestureHandler>
    )
  },
)
