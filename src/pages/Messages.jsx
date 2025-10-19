import React, { useState, useEffect, useRef } from 'react'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Send, Paperclip, User, Mail, Clock, Search, Plus } from 'lucide-react'

const Messages = () => {
  const { messages, users, loading, refreshData } = useData()
  const { user } = useAuth()
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [attachments, setAttachments] = useState([])
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Get conversations (unique combinations of sender/recipient)
  const getConversations = () => {
    const conversations = new Map()
    
    messages.forEach(message => {
      const otherUserId = message.sender_id === user?.userId ? message.recipient_id : message.sender_id
      const otherUser = users.find(u => u.id === otherUserId)
      
      if (!otherUser) return

      const conversationKey = `${Math.min(message.sender_id, message.recipient_id)}-${Math.max(message.sender_id, message.recipient_id)}`
      
      if (!conversations.has(conversationKey)) {
        conversations.set(conversationKey, {
          otherUser,
          lastMessage: message,
          unreadCount: 0,
          messages: []
        })
      }

      const conversation = conversations.get(conversationKey)
      conversation.messages.push(message)
      
      // Update unread count if user is recipient and message is unread
      if (message.recipient_id === user?.userId && !message.is_read) {
        conversation.unreadCount++
      }

      // Update last message if this is more recent
      if (new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
        conversation.lastMessage = message
      }
    })

    // Sort conversations by last message date
    return Array.from(conversations.values()).sort((a, b) => 
      new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
    )
  }

  const conversations = getConversations()
  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.otherUser.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.content?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get messages for selected conversation
  const conversationMessages = selectedConversation 
    ? messages.filter(msg => 
        (msg.sender_id === user?.userId && msg.recipient_id === selectedConversation.otherUser.id) ||
        (msg.recipient_id === user?.userId && msg.sender_id === selectedConversation.otherUser.id)
      ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    : []

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages])

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      const unreadMessages = conversationMessages.filter(msg => 
        msg.recipient_id === user?.userId && !msg.is_read
      )
      
      unreadMessages.forEach(async (msg) => {
        try {
          await axios.put(`/api/messages/${msg.id}/read`)
        } catch (error) {
          console.error('Error marking message as read:', error)
        }
      })
      
      if (unreadMessages.length > 0) {
        refreshData()
      }
    }
  }, [selectedConversation, conversationMessages, user?.userId, refreshData])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      await axios.post('/api/messages', {
        recipient_id: selectedConversation.otherUser.id,
        subject: `Mesaj pentru ${selectedConversation.otherUser.full_name || selectedConversation.otherUser.username}`,
        content: newMessage,
        file_attachments: attachments.map(file => file.name)
      })

      setNewMessage('')
      setAttachments([])
      toast.success('Mesajul a fost trimis!')
      refreshData()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Eroare la trimiterea mesajului!')
    }
  }

  const handleComposeMessage = async (formData) => {
    try {
      await axios.post('/api/messages', formData)
      toast.success('Mesajul a fost trimis!')
      setShowComposeModal(false)
      refreshData()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Eroare la trimiterea mesajului!')
    }
  }

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files)
    setAttachments(files)
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })
    }
  }

  // Get total unread count
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Mesaje</h1>
              <button
                onClick={() => setShowComposeModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nou
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Caută conversații..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'Nu s-au găsit conversații.' : 'Nu ai mesaje încă.'}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const lastMsg = conversation.lastMessage
                const isUnread = conversation.unreadCount > 0
                
                return (
                  <button
                    key={`${conversation.otherUser.id}`}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedConversation?.otherUser.id === conversation.otherUser.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-semibold truncate ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {conversation.otherUser.full_name || conversation.otherUser.username}
                          </h3>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatTime(lastMsg.created_at)}
                          </span>
                        </div>
                        
                        <p className={`text-sm truncate mt-1 ${isUnread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                          {lastMsg.content}
                        </p>
                        
                        {isUnread && (
                          <div className="flex justify-end mt-2">
                            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                              {conversation.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversation.otherUser.full_name || selectedConversation.otherUser.username}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.otherUser.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversationMessages.map((message) => {
                  const isOwn = message.sender_id === user?.userId
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isOwn 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        
                        {/* File attachments */}
                        {message.file_attachments && message.file_attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.file_attachments.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs opacity-90">
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate">{file}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className={`text-xs mt-1 ${
                          isOwn ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.created_at)}
                          {isOwn && message.is_read && (
                            <span className="ml-1">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                {attachments.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg text-sm">
                          <Paperclip className="w-4 h-4" />
                          <span>{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAttachmentChange}
                    multiple
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Scrie un mesaj..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Selectează o conversație</h3>
                <p>Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <ComposeModal
          users={users.filter(u => u.id !== user?.userId)}
          onSubmit={handleComposeMessage}
          onClose={() => setShowComposeModal(false)}
        />
      )}
    </Layout>
  )
}

// Compose Modal Component
const ComposeModal = ({ users, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    content: '',
    file_attachments: []
  })
  const fileInputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.recipient_id || !formData.content.trim()) {
      toast.error('Recipient și conținut sunt obligatorii!')
      return
    }
    onSubmit(formData)
  }

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files)
    setFormData({ ...formData, file_attachments: files })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Mesaj nou</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destinatar *
              </label>
              <select
                required
                value={formData.recipient_id}
                onChange={(e) => setFormData({ ...formData, recipient_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selectează utilizator</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subiect
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mesaj *
              </label>
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Atașamente
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAttachmentChange}
                multiple
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.file_attachments.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Fișiere selectate:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.file_attachments.map((file, index) => (
                      <span key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {file.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Trimite
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Anulează
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Messages
