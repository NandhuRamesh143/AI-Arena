import { LLMMessage } from "./LLMMessage";

interface Message {
  name: string;
  message: string;
}

export interface MessageBoxProps {
  name: string;
  message: string;
  isSelf: boolean;
  fontSize?: string;
}

export default function MessageBox({ name, message, isSelf = false , fontSize = "text-sm"}: MessageBoxProps) {
  return (
    <div className="w-full flex flex-col">
      {isSelf ? <Self name={name} message={message} fontSize={fontSize} /> : <Other name={name} message={message} fontSize={fontSize} />}
    </div>
  );
}

function Self({ name, message, fontSize }: Message & { fontSize?: string }) {
  return (
    <div className="flex flex-col items-end self-end max-w-[80%]">
      <span className="text-xs text-zinc-400 font-medium mb-1 mr-1">
        {name}
      </span>
      <div className="bg-zinc-800 text-zinc-200 px-4 py-3 rounded-2xl rounded-tr-none border border-zinc-700/60 shadow-md wrap-break-words text-sm leading-relaxed">
        <LLMMessage content={message} fontSize={fontSize}></LLMMessage>
      </div>
    </div>
  );
}

function Other({ name, message, fontSize }: Message & { fontSize?: string }) {
  return (
    <div className="flex flex-col items-start self-start max-w-[80%]">
      <span className="text-xs text-zinc-400 font-medium mb-1 ml-1">
        {name}
      </span>
      <div className="bg-gray-800 text-zinc-800 px-4 py-3 rounded-2xl rounded-tl-none border border-zinc-700/60 shadow-md wrap-break-words text-sm leading-relaxed">
        <LLMMessage content={message} fontSize={fontSize}></LLMMessage>
      </div>
    </div>
  );
}
