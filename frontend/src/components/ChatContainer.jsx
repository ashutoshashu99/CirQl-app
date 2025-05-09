import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Slack, Languages } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [summarised, setSummarised] = useState("");

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }
  const handleSummarisation = async (id, text) => {
    const withLoading = messages.map((msg) =>
      msg._id === id ? { ...msg, isSummarizing: true } : msg
    );
    useChatStore.setState({ messages: withLoading });

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      const updatedMessages = messages.map((msg) =>
        msg._id === id
          ? {
              ...msg,
              originalText: msg.originalText || msg.text,
              text: data.summary,
              summary: data.summary,
              showSummary: true,
              isSummarizing: false,
            }
          : msg
      );

      useChatStore.setState({ messages: updatedMessages });
    } catch (err) {
      console.error("Error summarizing message:", err);

      const resetMessages = messages.map((msg) =>
        msg._id === id ? { ...msg, isSummarizing: false } : msg
      );

      useChatStore.setState({ messages: resetMessages });
    }
  };
  const toggleSummary = (id) => {
    const toggled = messages.map((msg) =>
      msg._id === id
        ? {
            ...msg,
            showSummary: !msg.showSummary,
            text: !msg.showSummary ? msg.summary : msg.originalText,
          }
        : msg
    );
    useChatStore.setState({ messages: toggled });
  };

  function handleTranslation(id, text) {}

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${
              message.senderId === authUser._id ? "chat-end" : "chat-start"
            }`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1 flex items-center gap-2">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>

              {message.text?.length > 5 && !message.isSummarizing && (
                <button
                  className="transition-transform duration-200 hover:scale-110 hover:text-blue-600"
                  onClick={() => handleSummarisation(message._id, message.text)}
                >
                  <Slack size={16} color="#3a88fe" strokeWidth={0.5} />
                </button>
              )}

              {message.summary && !message.isSummarizing && (
                <button
                  className="text-xs text-gray-400 underline"
                  onClick={() => toggleSummary(message._id)}
                >
                  {message.showSummary ? "Show Original" : "Show Summary"}
                </button>
              )}
            </div>

            <div className="chat-bubble flex flex-col">
              {message.isSummarizing ? (
                <div className="skeleton h-16 w-[200px]" />
              ) : (
                <>
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2"
                    />
                  )}
                  {message.text && <p>{message.text}</p>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
