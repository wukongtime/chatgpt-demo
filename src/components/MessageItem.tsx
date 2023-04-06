import type { Accessor } from 'solid-js'
import type { ChatMessage } from '@/types'
import MarkdownIt from 'markdown-it'
// @ts-ignore
import mdKatex from 'markdown-it-katex'
import mdHighlight from 'markdown-it-highlightjs'
import IconRefresh from './icons/Refresh'

interface Props {
  role: ChatMessage['role']
  message: Accessor<string> | string
  index?: Accessor<Number> | number
  showRetry?: Accessor<boolean>
  onRetry?: () => void
}

export default ({ role, message, index, showRetry, onRetry }: Props) => {
  const roleClass = {
    system: 'bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300',
    user: 'bg-gradient-to-r from-purple-400 to-yellow-400',
    assistant: 'bg-gradient-to-r from-yellow-200 via-green-200 to-green-300',
  }
  const htmlString = () => {
    const md = MarkdownIt().use(mdKatex).use(mdHighlight)

    if (typeof message === 'function') {
      return md.render(message())
    } else if (typeof message === 'string') {
      if (index === 0) {
        let newString = message.replace('你是一个广告投放优化师，基于品牌广告主的商品"', '')
        let resultString = newString.replace('"，撰写广告文案，文案用于投放APP的开屏广告，因此文案内容要有创意，文字优美，朗朗上口，能吸引人点击。请生成5个广告文案，每个文案控制在中文长度20个字以内', '')
        return md.render(resultString)
      } else {
        return md.render(message)
      }
    }
    return ''
  }
  return (
    <div class="py-2 -mx-4 px-4 transition-colors md:hover:bg-slate/3">
      <div class="flex gap-3 rounded-lg" class:op-75={role === 'user'}>
        <div class={`shrink-0 w-7 h-7 mt-4 rounded-full op-80 ${roleClass[role]}`}></div>
        <div class="message prose text-slate break-words overflow-hidden" innerHTML={htmlString()} />
      </div>
    </div>
  )
}
