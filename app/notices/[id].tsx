import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Notice } from '../../types';

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchNoticeDetail(id);
    }
  }, [id]);

  const fetchNoticeDetail = async (noticeId: string) => {
    try {
      const docRef = doc(db, 'notices', noticeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setNotice({
          id: docSnap.id,
          ...docSnap.data()
        } as Notice);
      }
    } catch (error) {
      console.error('Error fetching notice detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: '공지사항',
            headerStyle: { backgroundColor: '#12131F' },
            headerTintColor: '#FFFFFF',
            headerShadowVisible: false,
          }} 
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </View>
    );
  }

  if (!notice) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: '공지사항',
            headerStyle: { backgroundColor: '#12131F' },
            headerTintColor: '#FFFFFF',
            headerShadowVisible: false,
          }} 
        />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>공지사항을 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: '공지사항',
          headerStyle: { backgroundColor: '#12131F' },
          headerTintColor: '#FFFFFF',
          headerShadowVisible: false,
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.date}>{formatDate(notice.createdAt)}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.content}>{notice.content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12131F',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 28,
  },
  date: {
    fontSize: 13,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  content: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  errorText: {
    color: '#8E8E93',
    fontSize: 16,
  },
});