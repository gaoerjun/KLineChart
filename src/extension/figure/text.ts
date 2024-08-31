/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import BigNumber from 'bignumber.js'
import type Coordinate from '../../common/Coordinate'
import { type TextStyle } from '../../common/Styles'

import { createFont, calcTextWidth } from '../../common/utils/canvas'

import { type FigureTemplate } from '../../component/Figure'

import { type RectAttrs, drawRect } from './rect'
interface FontInfo {
  fontSize: number
  fontWeight: number
  fontFamily: string

}
export function getTextRect (attrs: TextAttrs, styles: Partial<TextStyle>): RectAttrs {
  const { size = 12, paddingLeft = 0, paddingTop = 0, paddingRight = 0, paddingBottom = 0, weight = 'normal', family } = styles
  const { x, y, text, align = 'left', baseline = 'top', width: w, height: h } = attrs
  const width = w ?? (paddingLeft + calcTextWidth(text, size, weight, family) + paddingRight)
  const height = h ?? (paddingTop + size + paddingBottom)
  let startX: number
  switch (align) {
    case 'left':
    case 'start': {
      startX = x
      break
    }
    case 'right':
    case 'end': {
      startX = x - width
      break
    }
    default: {
      startX = x - width / 2
      break
    }
  }
  let startY: number
  switch (baseline) {
    case 'top':
    case 'hanging': {
      startY = y
      break
    }
    case 'bottom':
    case 'ideographic':
    case 'alphabetic': {
      startY = y - height
      break
    }
    default: {
      startY = y - height / 2
      break
    }
  }
  return { x: startX, y: startY, width, height }
}

export function checkCoordinateOnText (coordinate: Coordinate, attrs: TextAttrs | TextAttrs[], styles: Partial<TextStyle>): boolean {
  let texts: TextAttrs[] = []
  texts = texts.concat(attrs)
  for (let i = 0; i < texts.length; i++) {
    const { x, y, width, height } = getTextRect(texts[i], styles)
    if (
      coordinate.x >= x &&
      coordinate.x <= x + width &&
      coordinate.y >= y &&
      coordinate.y <= y + height
    ) {
      return true
    }
  }
  return false
}

export function formatToSIUnits (text: string, decimal: number = 6): string {
  const value = new BigNumber(text)
  let result
  if (value.gte(new BigNumber(1000000000))) {
    result = value.dividedBy(new BigNumber(1000000000)).toFixed(2, 1) + 'B'
  } else if (value.gte(new BigNumber(1000000))) {
    result = value.dividedBy(new BigNumber(1000000)).toFixed(2, 1) + 'M'
  } else if (value.gte(new BigNumber(1000))) {
    result = value.dividedBy(new BigNumber(1000)).toFixed(2, 1) + 'K'
  } else {
    result = format(value.toNumber(), decimal)
  }
  // console.log('将数字格式化为国际单位系统 =' + value + '    '+ result)
  return result
}
export function format (value: string | number, decimal: number, groupSeparator = ','): string {
  // console.log("value...", value)
  if (isNaN(new BigNumber(value).toNumber())) {
    return '--'
  }
  return new BigNumber(value).toFormat(decimal, 1, {
    decimalSeparator: '.',
    groupSeparator,
    groupSize: 3,
    secondaryGroupSize: 0,
    fractionGroupSeparator: ' ',
    fractionGroupSize: 0
  })
}
export const drawAdvancedText = (_value: string, ctx: CanvasRenderingContext2D, x: number, y: number, fontInfo: FontInfo): number => {
  let totalLength = 0

  if (isNaN(Number(_value)) || Number(_value) === 0) {
    ctx.fillText(_value, x, y)
    const valueLength = ctx.measureText(_value).width
    totalLength = totalLength + valueLength
    x = x + valueLength
  } else {
    if (Number(_value) < 1) {
      const stringValue = _value.toString()
      const parts = stringValue.split('.')
      // 如果没有小数部分，或者小数部分长度小于等于minDecimalPlaces，则直接返回
      if (parts.length === 1 || parts[1].length <= 6) {
        ctx.fillText(stringValue, x, y)
        const stringWidth = ctx.measureText(stringValue).width
        x = x + stringWidth
        totalLength = totalLength + stringWidth
      } else {
        // 如果小数部分长度大于minDecimalPlaces，检查是否有前导零
        const leadingZeros = parts[1].match(/^0+/)
        if (leadingZeros != null && leadingZeros[0]?.length >= 3) {
          // 如果前导零的数量大于minDecimalPlaces，则格式化输出
          const nonZeroDecimalPart = parts[1].slice(leadingZeros[0].length) // 移除前导零
          ctx.fillText('0.0', x, y)

          const width = ctx.measureText('0.0').width
          totalLength = totalLength + width
          // ctx.font = `${fontInfo?.fontWeight} ${fontInfo?.fontSize ?? 10 * 0.5}px ${fontInfo?.fontFamily}`
          ctx.font = '400 10px Roboto'
          const fontDecWidth = ctx.measureText(leadingZeros[0].length.toString()).width
          totalLength = totalLength + fontDecWidth
          ctx.fillText(leadingZeros[0].length.toString(), x + width, y + 5)
          ctx.font = `${fontInfo?.fontWeight} ${fontInfo?.fontSize}px ${fontInfo?.fontFamily}`
          const decemalPartLegnth = ctx.measureText(nonZeroDecimalPart.substring(0, 4)).width
          totalLength = totalLength + decemalPartLegnth

          ctx.fillText(nonZeroDecimalPart.substring(0, 4), x + width + fontDecWidth, y)
          x = x + width + fontDecWidth + decemalPartLegnth
        } else {
          ctx.fillText(format(stringValue, 6), x, y)
          totalLength = totalLength + ctx.measureText(format(stringValue, 6)).width
          x = x + ctx.measureText(format(stringValue, 6)).width
        }
      }
    } else {
      const value = formatToSIUnits(_value.toString(), 4)
      const textWidth = ctx.measureText(value).width
      ctx.fillText(value, x, y)
      totalLength = totalLength + textWidth
      x = x + textWidth
    }
  }
  return totalLength
}

export function drawText (ctx: CanvasRenderingContext2D, attrs: TextAttrs | TextAttrs[], styles: Partial<TextStyle>): void {
  let texts: TextAttrs[] = []
  texts = texts.concat(attrs)
  const {
    color = 'currentColor',
    size = 12,
    family = 'Roboto',
    weight = 400,
    paddingLeft = 0,
    paddingTop = 0
  } = styles
  const rects = texts.map(text => getTextRect(text, styles))
  drawRect(ctx, rects, { ...styles, color: styles.backgroundColor })

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = createFont(size, weight, family)
  ctx.fillStyle = color

  texts.forEach((text, index) => {
    const rect = rects[index]
    drawAdvancedText(text.text, ctx, rect.x + paddingLeft, rect.y + paddingTop, { fontSize: size, fontWeight: 400, fontFamily: family })
    // ctx.fillText(text.text, rect.x + paddingLeft, rect.y + paddingTop, rect.width - paddingLeft - paddingRight)
  })
}

export interface TextAttrs {
  x: number
  y: number
  text: string
  width?: number
  height?: number
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
}

const text: FigureTemplate<TextAttrs | TextAttrs[], Partial<TextStyle>> = {
  name: 'text',
  checkEventOn: checkCoordinateOnText,
  draw: (ctx: CanvasRenderingContext2D, attrs: TextAttrs | TextAttrs[], styles: Partial<TextStyle>) => {
    drawText(ctx, attrs, styles)
  }
}

export default text
