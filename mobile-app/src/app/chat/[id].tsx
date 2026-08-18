import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, Image, Modal, ScrollView } from 'react-native';
import { TextInput, IconButton, Text, Card, ActivityIndicator, Divider, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Socket } from 'socket.io-client';
import { Send, Paperclip, Search, Pin, Reply, X, Check, CheckCheck, FileText, Play, ArrowLeft } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '../../store/authStore';
import { getSocket, disconnectSocket } from '../../services/socket';
import { api } from '../../services/api';

export default function ChatRoomScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Pinned Messages
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [showPinsModal, setShowPinsModal] = useState(false);

  // Reply Threading
  const [replyingTo, setReplyingTo] = useState<any | null>(null);

  // Typing indicators
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatListRef = useRef<FlatList | null>(null);

  // Fetch Message history
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/chat/groups/${id}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load message history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Pinned Messages
  const fetchPinnedMessages = async () => {
    try {
      const res = await api.get(`/chat/groups/${id}/pins`);
      setPinnedMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch pinned messages:', err);
    }
  };

  // Mark group messages as read
  const markMessagesAsRead = async () => {
    try {
      await api.post(`/chat/groups/${id}/read`);
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchPinnedMessages();
    markMessagesAsRead();

    if (accessToken) {
      const socket = getSocket(accessToken);
      socketRef.current = socket;

      // Join chat room
      socket.emit('join_room', id);

      // Listen for new messages
      socket.on('new_message', (message: any) => {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        markMessagesAsRead();
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      // Listen for typing indicator
      socket.on('typing_indicator', (data: { groupId: string; username: string; isTyping: boolean }) => {
        if (data.groupId === id) {
          setTypingUser(data.isTyping ? data.username : null);
        }
      });

      // Listen for pin events
      socket.on('message_pinned', () => {
        fetchPinnedMessages();
      });
      socket.on('message_unpinned', () => {
        fetchPinnedMessages();
      });

      // Listen for read receipts
      socket.on('read_receipt', ({ userId }: { userId: string }) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.senderId?._id === user?.id || msg.senderId === user?.id) {
              const alreadyRead = msg.readBy.some((r: any) => (r.userId?._id || r.userId) === userId);
              if (!alreadyRead) {
                return {
                  ...msg,
                  readBy: [...msg.readBy, { userId, readAt: new Date() }],
                };
              }
            }
            return msg;
          })
        );
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_room', id);
        socketRef.current.off('new_message');
        socketRef.current.off('typing_indicator');
        socketRef.current.off('message_pinned');
        socketRef.current.off('message_unpinned');
        socketRef.current.off('read_receipt');
      }
      disconnectSocket();
    };
  }, [id, accessToken]);

  const handleSend = async () => {
    if (!text.trim()) return;

    const content = text;
    setText('');

    // Emit stop typing immediately on send
    if (socketRef.current) {
      socketRef.current.emit('typing', { groupId: id, isTyping: false });
    }

    const payload: any = { content };
    if (replyingTo) {
      payload.replyTo = replyingTo._id;
      setReplyingTo(null);
    }

    try {
      const res = await api.post(`/chat/groups/${id}/messages`, payload);
      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const pickedFile = result.assets[0];

      const formData = new FormData();
      formData.append('attachments', {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType || 'application/octet-stream',
      } as any);

      if (replyingTo) {
        formData.append('replyTo', replyingTo._id);
        setReplyingTo(null);
      }

      const res = await api.post(`/chat/groups/${id}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessages((prev) => [...prev, res.data]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('Failed to pick document:', err);
      Alert.alert('Upload Failed', 'Failed to pick or upload document.');
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);

    if (!socketRef.current) return;

    socketRef.current.emit('typing', { groupId: id, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('typing', { groupId: id, isTyping: false });
      }
    }, 2000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      fetchMessages();
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`/chat/groups/${id}/search?q=${encodeURIComponent(searchQuery)}`);
      setMessages(res.data);
      setIsSearching(true);
    } catch (err) {
      console.error('Search failed:', err);
      Alert.alert('Error', 'Message search failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    fetchMessages();
  };

  const handleMessageLongPress = (msg: any) => {
    const isPinned = pinnedMessages.some((p) => p._id === msg._id);

    Alert.alert(
      'Message Actions',
      'Choose an action for this message.',
      [
        { text: 'Reply', onPress: () => setReplyingTo(msg) },
        {
          text: isPinned ? '📌 Unpin Message' : '📌 Pin Message',
          onPress: () => togglePinMessage(msg._id, isPinned),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const togglePinMessage = async (messageId: string, isPinned: boolean) => {
    try {
      const endpoint = isPinned ? 'unpin' : 'pin';
      await api.post(`/chat/groups/${id}/${endpoint}/${messageId}`);
      fetchPinnedMessages();
      Alert.alert('Success', `Message ${isPinned ? 'unpinned' : 'pinned'} successfully.`);
    } catch (err) {
      console.error('Pin action failed:', err);
      Alert.alert('Error', 'Failed to update message pin status.');
    }
  };

  // Highlights @username mentions in text
  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\s+)/);
    return (
      <Text style={styles.messageText}>
        {parts.map((part, idx) => {
          if (part.startsWith('@') && part.length > 1) {
            return (
              <Text key={idx} style={styles.mentionText}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const renderAttachment = (att: any) => {
    const fileUrl = `${api.defaults.baseURL?.replace('/api', '')}${att.url}`;
    const isImage = att.fileType.startsWith('image/');
    const isPdf = att.fileType.includes('pdf');
    const isAudio = att.fileType.startsWith('audio/');

    if (isImage) {
      return (
        <Image source={{ uri: fileUrl }} style={styles.attachmentImage} resizeMode="cover" key={att.url} />
      );
    } else if (isPdf) {
      return (
        <View style={styles.attachmentFileRow} key={att.url}>
          <FileText color="#38bdf8" size={24} />
          <Text style={styles.attachmentFileName} numberOfLines={1}>
            {att.filename}
          </Text>
        </View>
      );
    } else if (isAudio) {
      return (
        <View style={styles.attachmentFileRow} key={att.url}>
          <Play color="#10b981" size={20} />
          <Text style={styles.attachmentFileName} numberOfLines={1}>
            Voice Note: {att.filename}
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.attachmentFileRow} key={att.url}>
          <FileText color="#94a3b8" size={20} />
          <Text style={styles.attachmentFileName} numberOfLines={1}>
            {att.filename}
          </Text>
        </View>
      );
    }
  };

  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Search Header Row */}
      <View style={[styles.searchBarRow, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outline }]}>
        <IconButton icon={() => <ArrowLeft color={theme.colors.onSurfaceVariant} size={20} />} onPress={() => router.back()} />
        <TextInput
          mode="outlined"
          placeholder="Search in conversation..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          style={[styles.searchInput, { backgroundColor: theme.colors.background }]}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.onSurface}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          dense
          right={
            searchQuery ? (
              <TextInput.Icon icon={() => <X color={theme.colors.onSurfaceVariant} size={16} />} onPress={handleClearSearch} />
            ) : (
              <TextInput.Icon icon={() => <Search color={theme.colors.onSurfaceVariant} size={16} />} onPress={handleSearch} />
            )
          }
        />
      </View>

      {/* Pinned Messages Header Bar */}
      {pinnedMessages.length > 0 && (
        <TouchableOpacity style={[styles.pinnedHeaderBar, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderBottomColor: theme.colors.primary }]} onPress={() => setShowPinsModal(true)}>
          <Pin color={theme.colors.primary} size={14} style={{ marginRight: 6 }} />
          <Text style={[styles.pinnedHeaderText, { color: theme.colors.primary }]}>
            {pinnedMessages.length} Pinned {pinnedMessages.length === 1 ? 'Message' : 'Messages'} (Tap to View)
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} style={{ flex: 1, backgroundColor: theme.colors.background }} />
      ) : (
        <FlatList
          ref={(ref) => (flatListRef.current = ref)}
          data={messages}
          keyExtractor={(item) => item._id}
          style={{ backgroundColor: theme.colors.background }}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isSelf = item.senderId?._id === user?.id || item.senderId === user?.id;
            const hasBeenRead = isSelf && item.readBy.length > 1;

            return (
              <TouchableOpacity
                onLongPress={() => handleMessageLongPress(item)}
                delayLongPress={400}
                style={[styles.bubbleContainer, isSelf ? styles.selfAlign : styles.otherAlign]}
              >
                {!isSelf && <Text style={[styles.senderName, { color: theme.colors.onSurfaceVariant }]}>{item.senderId?.username || 'Unknown'}</Text>}
                
                <Card style={[styles.bubble, isSelf ? { backgroundColor: theme.colors.primary, borderTopRightRadius: 2 } : { backgroundColor: theme.colors.surfaceVariant, borderTopLeftRadius: 2 }]}>
                  <Card.Content style={styles.bubbleContent}>
                    {/* Reply Quoted Message block */}
                    {item.replyTo && (
                      <View style={styles.replyQuoteBlock}>
                        <View style={[styles.replyQuoteIndicator, { backgroundColor: theme.colors.primary }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.replyQuoteSender}>
                            {item.replyTo.senderId?.username || 'User'}
                          </Text>
                          <Text style={[styles.replyQuoteText, { color: isSelf ? '#cbd5e1' : theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                            {item.replyTo.content || 'Attachment'}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Rendering attachments */}
                    {item.attachments && item.attachments.map((att: any) => renderAttachment(att))}

                    {/* Rendering body text */}
                    {item.content ? (
                      <Text style={[styles.messageText, { color: isSelf ? '#ffffff' : theme.colors.onSurface }]}>
                        {item.content.split(/(\s+)/).map((part: string, idx: number) => {
                          if (part.startsWith('@') && part.length > 1) {
                            return (
                              <Text key={idx} style={[styles.mentionText, { color: isSelf ? '#a5b4fc' : theme.colors.primary }]}>
                                {part}
                              </Text>
                            );
                          }
                          return part;
                        })}
                      </Text>
                    ) : null}

                    {/* Footer Row: Timestamp + Read ticks */}
                    <View style={styles.messageFooter}>
                      <Text style={[styles.messageTime, isSelf ? styles.selfTime : { color: theme.colors.onSurfaceVariant }]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {isSelf && (
                        <View style={styles.readReceiptContainer}>
                          {hasBeenRead ? (
                            <CheckCheck color={theme.colors.secondary} size={12} />
                          ) : (
                            <Check color={theme.colors.onSurfaceVariant} size={12} />
                          )}
                        </View>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Typing indicator banner */}
      {typingUser && (
        <View style={[styles.typingBanner, { backgroundColor: 'rgba(99, 102, 241, 0.06)' }]}>
          <Text style={[styles.typingText, { color: theme.colors.primary }]}>{typingUser} is typing...</Text>
        </View>
      )}

      {/* Reply Preview Bar above Input */}
      {replyingTo && (
        <View style={[styles.replyPreviewBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
          <Reply color={theme.colors.primary} size={14} style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.replyPreviewTitle, { color: theme.colors.primary }]}>
              Replying to {replyingTo.senderId?.username || 'User'}
            </Text>
            <Text style={[styles.replyPreviewSubtitle, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {replyingTo.content || 'Attachment'}
            </Text>
          </View>
          <IconButton icon={() => <X color={theme.colors.onSurfaceVariant} size={16} />} onPress={() => setReplyingTo(null)} style={{ margin: 0 }} />
        </View>
      )}

      {/* Input controls */}
      <View style={[styles.inputArea, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outline }]}>
        <IconButton icon={() => <Paperclip color={theme.colors.onSurfaceVariant} size={20} />} onPress={handlePickFile} style={styles.clipBtn} />
        <TextInput
          mode="outlined"
          placeholder="Type your message..."
          value={text}
          onChangeText={handleTextChange}
          style={[styles.input, { backgroundColor: theme.colors.background }]}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.onSurface}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
        <IconButton
          icon={() => <Send color="#ffffff" size={20} />}
          onPress={handleSend}
          style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]}
        />
      </View>

      {/* Pinned Messages Modal */}
      <Modal visible={showPinsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>📌 Pinned Messages</Text>
              <IconButton icon={() => <X color={theme.colors.onSurface} size={20} />} onPress={() => setShowPinsModal(false)} />
            </View>
            <Divider style={{ backgroundColor: theme.colors.outline }} />
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {pinnedMessages.length === 0 ? (
                <Text style={[styles.emptyPinsText, { color: theme.colors.onSurfaceVariant }]}>No pinned messages yet.</Text>
              ) : (
                pinnedMessages.map((pin) => (
                  <View key={pin._id} style={styles.pinItem}>
                    <Text style={[styles.pinSender, { color: theme.colors.primary }]}>{pin.senderId?.username || 'User'}:</Text>
                    <Text style={[styles.pinBody, { color: theme.colors.onSurface }]}>{pin.content || 'Attachment'}</Text>
                    <Divider style={{ backgroundColor: theme.colors.outline, marginTop: 10 }} />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    height: 36,
    marginRight: 8,
  },
  pinnedHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
  },
  pinnedHeaderText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
  },
  bubbleContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  selfAlign: {
    alignSelf: 'flex-end',
  },
  otherAlign: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '700',
    marginBottom: 2,
    marginLeft: 6,
  },
  bubble: {
    borderRadius: 16,
    borderWidth: 0,
    elevation: 0,
  },
  selfBubble: {
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: theme.colors.outline,
    borderTopLeftRadius: 2,
  },
  bubbleContent: {
    padding: 10,
    paddingBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  mentionText: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 9,
    fontWeight: '600',
  },
  selfTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: theme.colors.onSurfaceVariant,
  },
  readReceiptContainer: {
    justifyContent: 'center',
  },
  typingBanner: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  typingText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.outline,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  replyPreviewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  replyPreviewSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  replyQuoteBlock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    gap: 6,
  },
  replyQuoteIndicator: {
    width: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 1.5,
  },
  replyQuoteSender: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  replyQuoteText: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 6,
  },
  attachmentFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    gap: 8,
    maxWidth: 200,
  },
  attachmentFileName: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  clipBtn: {
    margin: 0,
    marginRight: 6,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    marginRight: 10,
    height: 40,
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    width: 44,
    height: 44,
    margin: 0,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.onSurface,
  },
  emptyPinsText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    paddingVertical: 32,
    fontSize: 14,
  },
  pinItem: {
    marginBottom: 12,
  },
  pinSender: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  pinBody: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
});
