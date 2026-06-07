import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import RNPickerSelect from 'react-native-picker-select';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  START: 'timerStart',
  TITLE: 'eventTitle',
  CALENDAR: 'selectedCalendarId',
};

export default function App() {
  const [eventTitle, setEventTitle] = useState('');
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setupCalendars();
  }, []);

  useEffect(() => {
    (async () => {
      const savedTitle = await AsyncStorage.getItem(STORAGE_KEYS.TITLE);
      const savedCalendar = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR);
      const savedStart = await AsyncStorage.getItem(STORAGE_KEYS.START);

      if (savedTitle) setEventTitle(savedTitle);
      if (savedCalendar) setSelectedCalendarId(savedCalendar);

      if (savedStart) {
        startRef.current = Number(savedStart);
        setRunning(true);
        startInterval(Number(savedStart));
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.TITLE, eventTitle);
  }, [eventTitle]);

  useEffect(() => {
    if (selectedCalendarId) {
      AsyncStorage.setItem(STORAGE_KEYS.CALENDAR, selectedCalendarId);
    }
  }, [selectedCalendarId]);

  function startInterval(startTime: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }

  async function setupCalendars() {
    const { status } = await Calendar.requestCalendarPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Calendar permission is required.');
      return;
    }

    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    setCalendars(cals);
  }

  async function startTimer() {
    const now = Date.now();

    startRef.current = now;
    setRunning(true);
    setElapsed(0);

    await AsyncStorage.setItem(STORAGE_KEYS.START, String(now));
    startInterval(now);
  }

  async function stopTimer() {
    if (!selectedCalendarId || !startRef.current) return;

    const start = startRef.current;
    const end = Date.now();

    setRunning(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    await AsyncStorage.removeItem(STORAGE_KEYS.START);

    const durationSeconds = Math.floor((end - start) / 1000);

    try {
      await Calendar.createEventAsync(selectedCalendarId, {
        title: eventTitle || 'Timed Event',
        startDate: new Date(start),
        endDate: new Date(end),
        notes: `Duration: ${format(durationSeconds)}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      Alert.alert('Saved', 'Event added to calendar');
    } catch (e) {
      Alert.alert('Error', 'Could not create event');
    }
  }

  const label = format(elapsed);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendar Timer</Text>

      <TextInput
        style={styles.input}
        value={eventTitle}
        onChangeText={setEventTitle}
        placeholder="Event name"
        placeholderTextColor="#A89B91"
      />

      {/* Dropdown */}
      <View style={styles.inputLikeBox}>
        <RNPickerSelect
          onValueChange={(value) => setSelectedCalendarId(value)}
          value={selectedCalendarId}
          placeholder={{
            label: 'Select calendar...',
            value: null,
          }}
          items={calendars.map((cal) => ({
            label: cal.title || 'Untitled Calendar',
            value: cal.id,
          }))}
          style={pickerSelectStyles}
        />
      </View>

      <Text style={styles.timer}>{label}</Text>

      {!running ? (
        <TouchableOpacity style={styles.button} onPress={startTimer}>
          <Text style={styles.buttonText}>Start Timer</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.button, styles.stop]} onPress={stopTimer}>
          <Text style={styles.buttonText}>Stop & Save</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function format(total: number) {
  const h = Math.floor(total / 3600).toString().padStart(2, '0');
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1E1A17',
  },

  title: {
    color: '#F3E9DC',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },

  input: {
    backgroundColor: '#2B2521',
    color: '#F3E9DC',
    borderWidth: 1,
    borderColor: '#5C4B3F',
    borderRadius: 12,

    height: 56,
    paddingHorizontal: 8,   // ✅ unified spacing
    fontSize: 16,
    marginBottom: 16,
  },

  inputLikeBox: {
    backgroundColor: '#2B2521',
    borderWidth: 1,
    borderColor: '#5C4B3F',
    borderRadius: 12,

    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginBottom: 16,
    overflow: 'hidden',
  },

  timer: {
    color: '#E0A96D',
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },

  button: {
    backgroundColor: '#2E7D5A',
    padding: 16,
    borderRadius: 14,
  },

  // stop: {
  //   backgroundColor: '#C96A4A',
  // },
  stop: {
    backgroundColor: '#E0523C', // 🔥 punchier red-orange
    shadowColor: '#E0523C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6, // Android glow
  },

  buttonText: {
    color: '#FFF8F0',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
});

const pickerSelectStyles = {
  inputIOS: {
    color: '#F3E9DC',
    fontSize: 16,

    height: 56,
    paddingHorizontal: 8,   
    paddingVertical: 0,
    lineHeight: 20,
  },

  inputAndroid: {
    color: '#F3E9DC',
    fontSize: 16,

    height: 56,
    paddingHorizontal: 8,  
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  placeholder: {
    color: '#A89B91',
  },
};
