import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db, COLLECTIONS } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { colors, radius, spacing } from '../../lib/theme'
import { GamingCard } from '../../components/ui/GamingCard'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { formatRelativeTime } from '../../../../packages/shared/src/types'

const PAGE_SIZE = 10

interface Post {
  id: string
  authorId: string
  authorName: string
  content: string
  likes: string[]
  commentCount: number
  createdAt: any
}

export default function FeedScreen() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)

  async function loadPosts(after?: QueryDocumentSnapshot) {
    try {
      const q = after
        ? query(
            collection(db, COLLECTIONS.COMMUNITY_POSTS),
            orderBy('createdAt', 'desc'),
            startAfter(after),
            limit(PAGE_SIZE),
          )
        : query(
            collection(db, COLLECTIONS.COMMUNITY_POSTS),
            orderBy('createdAt', 'desc'),
            limit(PAGE_SIZE),
          )
      const snap = await getDocs(q)
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post))
      if (after) {
        setPosts((prev) => [...prev, ...items])
      } else {
        setPosts(items)
      }
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
      setHasMore(snap.docs.length === PAGE_SIZE)
    } catch {
      // fail silently
    }
  }

  useEffect(() => { loadPosts().finally(() => setLoading(false)) }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setLastDoc(null)
    setHasMore(true)
    await loadPosts()
    setRefreshing(false)
  }, [])

  async function loadMore() {
    if (!hasMore || loadingMore || !lastDoc) return
    setLoadingMore(true)
    await loadPosts(lastDoc)
    setLoadingMore(false)
  }

  async function handlePost() {
    const text = newPost.trim()
    if (!text || !user || !profile) return
    setPosting(true)
    try {
      await addDoc(collection(db, COLLECTIONS.COMMUNITY_POSTS), {
        authorId: user.uid,
        authorName: profile.gamerTag ?? profile.name ?? 'Gamer',
        content: text,
        likes: [],
        commentCount: 0,
        createdAt: serverTimestamp(),
      })
      setNewPost('')
      await onRefresh()
    } catch {
      Alert.alert('Error', 'Could not post. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  async function handleLike(post: Post) {
    if (!user) return
    const ref = doc(db, COLLECTIONS.COMMUNITY_POSTS, post.id)
    const liked = post.likes.includes(user.uid)
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likes: liked ? p.likes.filter((id) => id !== user.uid) : [...p.likes, user.uid] }
          : p,
      ),
    )
    try {
      await updateDoc(ref, { likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) })
    } catch {
      // Revert optimistic update on error
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes: post.likes } : p)),
      )
    }
  }

  if (loading) return <LoadingScreen message="Loading feed…" />

  return (
    <SafeAreaView style={styles.safe}>
      {/* Create post bar */}
      <View style={styles.compose}>
        <Avatar uri={profile?.avatarUrl} name={profile?.name} size={36} />
        <TextInput
          value={newPost}
          onChangeText={(v) => setNewPost(v.slice(0, 500))}
          placeholder="What's your gaming moment?"
          placeholderTextColor={colors.textMuted}
          style={styles.composeInput}
          multiline
          editable={!posting}
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handlePost}
          disabled={posting || !newPost.trim()}
          activeOpacity={0.8}
          style={[styles.postBtn, (!newPost.trim() || posting) && styles.postBtnDisabled]}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <EmptyState icon="🎮" title="No posts yet" subtitle="Be the first to share your gaming moment!" />
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={colors.purple} style={{ marginVertical: spacing.md }} /> : null
        }
        renderItem={({ item }) => <PostCard post={item} uid={user?.uid} onLike={handleLike} />}
      />
    </SafeAreaView>
  )
}

function PostCard({
  post,
  uid,
  onLike,
}: {
  post: Post
  uid?: string
  onLike: (post: Post) => void
}) {
  const liked = uid ? post.likes.includes(uid) : false
  return (
    <GamingCard padding={spacing.md}>
      <View style={styles.postHeader}>
        <Avatar name={post.authorName} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthor}>{post.authorName}</Text>
          <Text style={styles.postTime}>
            {post.createdAt?.toDate ? formatRelativeTime(post.createdAt.toDate()) : ''}
          </Text>
        </View>
      </View>
      <Text style={styles.postContent}>{post.content}</Text>
      <View style={styles.postActions}>
        <TouchableOpacity onPress={() => onLike(post)} style={styles.actionBtn}>
          <Text style={[styles.actionText, liked && { color: colors.purple }]}>
            {liked ? '♥' : '♡'} {post.likes.length}
          </Text>
        </TouchableOpacity>
        <View style={styles.actionBtn}>
          <Text style={styles.actionText}>💬 {post.commentCount}</Text>
        </View>
      </View>
    </GamingCard>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  compose: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  composeInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    maxHeight: 80,
    paddingTop: 0,
  },
  postBtn: {
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    minWidth: 56,
    alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  postHeader: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  postAuthor: { color: colors.text, fontWeight: '700', fontSize: 14 },
  postTime: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  postContent: { color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  postActions: { flexDirection: 'row', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
})
