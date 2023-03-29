import type { ChatMessage } from '@/types'
import { createSignal, Index, Show } from 'solid-js'
import IconClear from './icons/Clear'
import IconSend from './icons/Send'
import MessageItem from './MessageItem'
import SystemRoleSettings from './SystemRoleSettings'
import { generateSignature } from '@/utils/auth'
import IconRefresh from './icons/Refresh'

export default () => {
  let inputRef: HTMLTextAreaElement
  const [currentSystemRoleSettings, setCurrentSystemRoleSettings] = createSignal('')
  const [systemRoleEditing, setSystemRoleEditing] = createSignal(false)
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
  const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [controller, setController] = createSignal<AbortController>(null)

  const handleButtonClick = async () => {
    let inputValue = inputRef.value
    if (!inputValue) {
      return
    }
    inputRef.value = ''
    if (messageList().length === 0) {
      inputValue = '你是一个广告投放优化师，基于商品"' + inputValue + '"，撰写5个新广告文案，每个文案控制在中文长度10个字以内，不要有标点符号，文案内容要有创意，能吸引人点击'
    }
    setMessageList([
      ...messageList(),
      {
        role: 'user',
        content: inputValue,
      },
    ])
    requestWithLatestMessage()
  }

  const requestWithLatestMessage = async () => {
    setLoading(true)
    setCurrentAssistantMessage('')
    try {
      const controller = new AbortController()
      setController(controller)
      const requestMessageList = [...messageList()]
      if (currentSystemRoleSettings()) {
        requestMessageList.unshift({
          role: 'system',
          content: currentSystemRoleSettings(),
        })
      }
      const timestamp = Date.now()
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          messages: requestMessageList,
          time: timestamp,
          sign: await generateSignature({
            t: timestamp,
            m: requestMessageList?.[requestMessageList.length - 1]?.content || '',
          }),
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(response.statusText)
      }
      const data = response.body
      if (!data) {
        throw new Error('No data')
      }
      const reader = data.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        if (value) {
          let char = decoder.decode(value)
          if (char === '\n' && currentAssistantMessage().endsWith('\n')) {
            continue
          }
          if (char) {
            setCurrentAssistantMessage(currentAssistantMessage() + char)
          }
          window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'})
        }
        done = readerDone
      }
    } catch (e) {
      console.error(e)
      setLoading(false)
      setController(null)
      return
    }
    archiveCurrentMessage()
  }

  const archiveCurrentMessage = () => {
    if (currentAssistantMessage()) {
      setMessageList([
        ...messageList(),
        {
          role: 'assistant',
          content: currentAssistantMessage(),
        },
      ])
      setCurrentAssistantMessage('')
      setLoading(false)
      setController(null)
      inputRef.focus()
    }
  }

  const clear = () => {
    inputRef.value = ''
    inputRef.style.height = 'auto';
    setMessageList([])
    setCurrentAssistantMessage('')
    setCurrentSystemRoleSettings('')
  }

  const stopStreamFetch = () => {
    if (controller()) {
      controller().abort()
      archiveCurrentMessage()
    }
  }

  const retryLastFetch = () => {
    if (messageList().length > 0) {
      const lastMessage = messageList()[messageList().length - 1]
      console.log(lastMessage)
      if (lastMessage.role === 'assistant') {
        setMessageList(messageList().slice(0, -1))
        requestWithLatestMessage()
      }
    }
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.isComposing || e.shiftKey) {
      return
    }
    if (e.key === 'Enter') {
      handleButtonClick()
    }
  }

  return (
    <div>
      <div style="display: flex;flex-direction: row;flex-wrap: nowrap;justify-content: space-between;align-items: center;align-content: center;">
        <div>
          <span style="font-size: 1.5rem;font-weight: 700;">关键词</span>
          <span>(输如关键词|例如：KFC 炸鸡 七夕)</span>
        </div>
        <div class="flex">
          <button title="Clear" onClick={clear} disabled={systemRoleEditing()} class="flex items-center gap-1 px-2 py-0.5 op-70 border border-slate text-slate rounded-md text-sm cursor-pointer hover:bg-slate/10 mr2">
            <IconClear />
            <span>清空</span>
          </button>
          <div onClick={retryLastFetch} class="flex items-center gap-1 px-2 py-0.5 op-70 border border-slate text-slate rounded-md text-sm cursor-pointer hover:bg-slate/10">
            <IconRefresh />
            <span>重新生成</span>
          </div>
        </div>
      </div>
      <div class="flex mt2">
        <div class="flex-1 pr10">
        <textarea
            ref={inputRef!}
            style="background: #ffffff"
            disabled={systemRoleEditing()}
            onKeyDown={handleKeydown}
            placeholder="请输入关键词..."
            autocomplete="off"
            autofocus
            onInput={() => {
              inputRef.style.height = 'auto';
              inputRef.style.height = inputRef.scrollHeight + 'px';
            }}
            minLength="1"
            maxLength="300"
            rows="6"
            w-full
            px-3 py-3
            min-h-12
            max-h-36
            text-slate
            rounded-sm
            bg-slate
            bg-op-15
            resize-none
            focus:bg-op-20
            focus:ring-0
            focus:outline-none
            placeholder:text-slate-400
            placeholder:op-30
            scroll-pa-8px
          />
          <div style="display: flex;flex-direction: row;flex-wrap: wrap;justify-content: center;align-items: center;align-content: center;">
            <button style="border-radius: 1rem;background: linear-gradient(to right, #5dcab1, #47af96);color: #ffffff;" onClick={handleButtonClick} disabled={systemRoleEditing()} class="h-8 px-8 py-1 mt5">
              生成文案
            </button>
          </div>
        </div>
        <div class="flex-1 pl5 pr5" style="height: 40rem;overflow-y: auto;background-color: #ffffff;border-radius: 1rem;background: linear-gradient(to bottom right, #fffbf0 0%, #caf5ec 100%);">
            <Index each={messageList()}>
            {(message, index) => (
              <MessageItem
                index={index}
                role={message().role}
                message={message().content}
                showRetry={() => (message().role === 'assistant' && index === messageList().length - 1)}
                onRetry={retryLastFetch}
              />
            )}
          </Index>
          {currentAssistantMessage() && (
            <MessageItem
              role="assistant"
              message={currentAssistantMessage}
            />
          )}
          <Show
            when={!loading()}
            fallback={() => (
              <div class="h-12 my-4 flex gap-4 items-center justify-center bg-slate bg-op-15 text-slate rounded-sm">
                <span>AI正在思考...</span>
                <div class="px-2 py-0.5 border border-slate text-slate rounded-md text-sm op-70 cursor-pointer hover:bg-slate/10" onClick={stopStreamFetch}>停止</div>
              </div>
            )}
          >
            <div class="my-4 flex items-center gap-2 transition-opacity" class:op-50={systemRoleEditing()}>
              {/* <button onClick={handleButtonClick} disabled={systemRoleEditing()} h-12 px-4 py-2 bg-slate bg-op-15 hover:bg-op-20 text-slate rounded-sm>
                <IconSend />
              </button> */}
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}
