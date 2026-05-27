import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parseISO, isFuture, isToday } from 'date-fns';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToMyGroups, Group } from '../../lib/group';
import { useArchive } from '../../hooks/useArchive';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1; // 1~12

  const { data: archiveData, loading } = useArchive(year, month, selectedGroupId);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToMyGroups(user.uid, (myGroups) => {
      setGroups(myGroups);
      if (myGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(myGroups[0].id);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const markedDates = useMemo(() => {
    const dates: any = {};
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    Object.keys(archiveData).forEach(dateStr => {
      const count = archiveData[dateStr].answerCount;
      let bgColor = 'transparent';
      let textColor = theme.colors.textPrimary;

      if (count >= 10) {
        bgColor = theme.colors.accent;
        textColor = '#1A1612'; // 다크 대비색
      } else if (count >= 4) {
        bgColor = theme.colors.accentSoft;
        textColor = '#FFF';
      } else if (count >= 1) {
        bgColor = theme.colors.surfaceLight;
      }

      const isTodayDate = dateStr === todayStr;

      dates[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: bgColor,
            borderRadius: 8,
            borderWidth: isTodayDate ? 2 : 0,
            borderColor: isTodayDate ? theme.colors.accent : 'transparent',
          },
          text: {
            color: textColor,
            fontWeight: isTodayDate ? 'bold' : 'normal',
          }
        }
      };
    });

    // archiveData에 없는 오늘 날짜 처리
    if (!dates[todayStr]) {
      dates[todayStr] = {
        customStyles: {
          container: {
            borderWidth: 2,
            borderColor: theme.colors.accent,
            borderRadius: 8,
          },
          text: {
            color: theme.colors.textPrimary,
            fontWeight: 'bold',
          }
        }
      };
    }

    // 선택된 날짜
    if (selectedDate) {
      if (dates[selectedDate]) {
        dates[selectedDate].customStyles.container.borderWidth = 2;
        dates[selectedDate].customStyles.container.borderColor = theme.colors.textSecondary;
      } else {
        dates[selectedDate] = {
          customStyles: {
            container: {
              borderWidth: 2,
              borderColor: theme.colors.textSecondary,
              borderRadius: 8,
            }
          }
        };
      }
    }

    return dates;
  }, [archiveData, selectedDate]);

  const handleDayPress = (day: DateData) => {
    const dateObj = parseISO(day.dateString);
    if (isFuture(dateObj)) return; // 미래 비활성화
    setSelectedDate(day.dateString);
  };

  const handleMonthChange = (date: DateData) => {
    setCurrentMonth(parseISO(date.dateString));
    setSelectedDate(null);
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {format(currentMonth, 'yyyy년 M월')}
        </Text>
        <TouchableOpacity 
          style={styles.groupSelector} 
          onPress={() => setShowGroupPicker(true)}
        >
          <Text style={styles.groupSelectorText} numberOfLines={1}>
            {selectedGroup ? selectedGroup.name : '그룹 선택'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 달력 */}
      <Calendar
        current={format(currentMonth, 'yyyy-MM-dd')}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        markingType={'custom'}
        markedDates={markedDates}
        maxDate={format(new Date(), 'yyyy-MM-dd')}
        theme={{
          calendarBackground: theme.colors.background,
          textSectionTitleColor: theme.colors.textSecondary,
          dayTextColor: theme.colors.textPrimary,
          todayTextColor: theme.colors.accent,
          monthTextColor: theme.colors.textPrimary,
          arrowColor: theme.colors.accent,
        }}
      />

      {/* 슬라이드업 패널 (간단히 하단 렌더링) */}
      {selectedDate && archiveData[selectedDate] && (
        <View style={styles.panel}>
          <Text style={styles.panelDate}>{format(parseISO(selectedDate), 'yyyy년 M월 d일')}</Text>
          {archiveData[selectedDate].question ? (
            <>
              <Text style={styles.panelQuestion}>{archiveData[selectedDate].question?.text}</Text>
              
              <View style={styles.panelAnswers}>
                <Text style={styles.panelAnswersTitle}>
                  답변 {archiveData[selectedDate].answerCount}개
                </Text>
                {archiveData[selectedDate].answers.slice(0, 3).map((ans, idx) => (
                  <View key={ans.id} style={styles.panelAnswerItem}>
                    <Text style={styles.panelAnswerText} numberOfLines={1}>
                      {ans.content}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.fullViewButton}
                onPress={() => router.push({
                  pathname: '/archive/[date]',
                  params: { date: selectedDate, groupId: selectedGroupId }
                })}
              >
                <Text style={styles.fullViewButtonText}>전체 보기</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noDataText}>해당 날짜의 질문이 없습니다.</Text>
          )}
        </View>
      )}

      {/* 그룹 선택 모달 */}
      <Modal visible={showGroupPicker} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowGroupPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>그룹 필터</Text>
            <ScrollView>
              {groups.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.groupOption, g.id === selectedGroupId && styles.groupOptionSelected]}
                  onPress={() => {
                    setSelectedGroupId(g.id);
                    setShowGroupPicker(false);
                  }}
                >
                  <Text style={[styles.groupOptionText, g.id === selectedGroupId && styles.groupOptionTextSelected]}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 150,
  },
  groupSelectorText: {
    marginRight: 4,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  panelDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  panelQuestion: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  panelAnswers: {
    marginBottom: 20,
  },
  panelAnswersTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  panelAnswerItem: {
    backgroundColor: theme.colors.surfaceLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  panelAnswerText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  fullViewButton: {
    backgroundColor: theme.colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  fullViewButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  noDataText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    width: '80%',
    maxHeight: '60%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  groupOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  groupOptionSelected: {
    backgroundColor: theme.colors.surfaceLight,
  },
  groupOptionText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  groupOptionTextSelected: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
