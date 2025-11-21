import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Mail, Trash2, Eye, EyeOff, Search, CheckCircle2, Circle } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Contact } from '@/types'

export const Contacts: React.FC = () => {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadContacts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await api.getContacts()
      setContacts(data.contacts)
      setUnreadCount(data.unread)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Use useMemo for filtering instead of useEffect to avoid infinite loops
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) {
      return contacts
    }

    const query = searchQuery.toLowerCase()
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.message.toLowerCase().includes(query)
    )
  }, [searchQuery, contacts])

  const handleView = (contact: Contact) => {
    setSelectedContact(contact)
    setIsModalOpen(true)
    // Mark as read if not already read
    if (!contact.read) {
      handleMarkAsRead(contact._id)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markContactAsRead(id)
      await loadContacts()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleMarkAsUnread = async (id: string) => {
    try {
      await api.markContactAsUnread(id)
      await loadContacts()
    } catch (error) {
      console.error('Failed to mark as unread:', error)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await api.deleteContact(deleteId)
      await loadContacts()
      setDeleteId(null)
    } catch (error) {
      console.error('Failed to delete contact:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact Messages</h1>
          <p className="text-gray-600">
            Total: {contacts.length} | Unread: <span className="font-semibold text-blue-600">{unreadCount}</span>
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by name, email, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="space-y-4">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {contacts.length === 0 ? 'No contact messages yet' : 'No messages found'}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <motion.div
              key={contact._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                contact.read ? 'border-gray-300' : 'border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {contact.read ? (
                      <CheckCircle2 className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-blue-500 fill-blue-500" />
                    )}
                    <h3 className={`text-lg font-semibold ${contact.read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {contact.name}
                    </h3>
                    {!contact.read && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">{contact.email}</p>
                  <p className={`text-gray-700 mb-3 line-clamp-2 ${contact.read ? '' : 'font-medium'}`}>
                    {contact.message}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{formatDate(contact.createdAt)}</span>
                    {contact.read && contact.readAt && (
                      <span>Read: {formatDate(contact.readAt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(contact)}
                    aria-label="View message"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {contact.read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsUnread(contact._id)}
                      aria-label="Mark as unread"
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(contact._id)}
                      aria-label="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(contact._id)}
                    aria-label="Delete message"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* View Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedContact(null)
        }}
        title="Contact Message"
      >
        {selectedContact && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-gray-900">{selectedContact.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{selectedContact.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedContact.message}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Sent</label>
              <p className="mt-1 text-gray-600">{formatDate(selectedContact.createdAt)}</p>
            </div>
            {selectedContact.read && selectedContact.readAt && (
              <div>
                <label className="text-sm font-medium text-gray-700">Read</label>
                <p className="mt-1 text-gray-600">{formatDate(selectedContact.readAt)}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Contact Message"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this contact message? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

