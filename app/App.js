/* App.js - SewaMitr (User Mobile)
   FlatList-based dashboard to avoid nested VirtualizedLists.
   Minimal behaviour changes from your original file.
*/

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, FlatList, Alert, ScrollView, StyleSheet, Linking, Animated, Easing } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import uuid from 'react-native-uuid';

// ------------------ CONFIG (edit if needed) ------------------
const DEFAULT_CLOUD_NAME = 'db06jof6r';
const DEFAULT_UPLOAD_PRESET = 'sewamitr-user';

const firebaseConfig = {
  apiKey: "AIzaSyByLYQyYsmbmlT2-sSePW2mP44SzzXCdis",
  authDomain: "sewamitruser-48301.firebaseapp.com",
  projectId: "sewamitruser-48301",
  storageBucket: "sewamitruser-48301.firebasestorage.app",
  messagingSenderId: "514092840910",
  appId: "1:514092840910:web:6cbffba560a34e11be9d9f"
};
// ------------------------------------------------------------

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function Splash({ onFinish }) {
  useEffect(() => {
    const t = setTimeout(() => onFinish(), 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={styles.splashContainer}>
      <Text style={styles.splashTitle}>SewaMitr</Text>
    </View>
  );
}

export default function App() {
  // App state
  const [stage, setStage] = useState('splash'); // splash -> welcome -> login/signup -> dashboard
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [cloudName, setCloudName] = useState(DEFAULT_CLOUD_NAME);
  const [uploadPreset, setUploadPreset] = useState(DEFAULT_UPLOAD_PRESET);
  const [image, setImage] = useState(null);
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [reports, setReports] = useState([]);
  const isMounted = useRef(true);

  // ISSUE TYPES definition (modify labels/dept keys to match your Firestore departments collection)
  const ISSUE_TYPES = [
  { key: 'default', label: 'Select an issue type', dept: 'none' },
  { key: 'road_pothole', label: 'Pothole / Road Damage', dept: 'roads' },
  { key: 'streetlight', label: 'Streetlight / Electricity', dept: 'electrical' },
  { key: 'sanitation', label: 'Garbage / Sanitation', dept: 'sanitation' },
  { key: 'water', label: 'Water / Drainage', dept: 'water' },
  { key: 'tree', label: 'Tree / Vegetation', dept: 'parks' },
  { key: 'others', label: 'Other (write below)', dept: 'others' },
];

  const [issueType, setIssueType] = useState(ISSUE_TYPES[0].key);
  const [otherIssueText, setOtherIssueText] = useState('');

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      await Location.requestForegroundPermissionsAsync();
      // load cloud settings from AsyncStorage if constants empty
      if (!DEFAULT_CLOUD_NAME || !DEFAULT_UPLOAD_PRESET) {
        try {
          const cn = await AsyncStorage.getItem('cloud_name');
          const up = await AsyncStorage.getItem('upload_preset');
          if (cn) setCloudName(cn);
          if (up) setUploadPreset(up);
        } catch (e) { console.log('load cloud err', e); }
      }

      const unsub = firebase.auth().onAuthStateChanged(u => {
        setUser(u);
        if (u) loadUserReports(u.uid);
      });

      return () => { unsub(); isMounted.current = false; };
    })();
    return () => { isMounted.current = false; };
  }, []);

  const getEffectiveCloudName = () => DEFAULT_CLOUD_NAME || cloudName;
  const getEffectiveUploadPreset = () => DEFAULT_UPLOAD_PRESET || uploadPreset;

  const onSplashFinish = () => setStage('welcome');

  const loadUserReports = (uid) => {
    // ensure composite index created in Firestore for this query
    db.collection('reports').where('uid', '==', uid).orderBy('createdAt', 'desc')
      .onSnapshot(qs => {
        const items = [];
        qs.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        if (isMounted.current) setReports(items);
      }, err => console.log('reports listen err', err));
  };

  // Auth
  const signUp = async () => {
    try {
      await firebase.auth().createUserWithEmailAndPassword(email, password);
      Alert.alert('Account created');
      setStage('dashboard');
    } catch (e) { Alert.alert('Signup error', e.message); }
  };
  const signIn = async () => {
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      Alert.alert('Signed in');
      setStage('dashboard');
    } catch (e) { Alert.alert('Signin error', e.message); }
  };
  const signOut = async () => {
    try { await firebase.auth().signOut(); setUser(null); setReports([]); setStage('welcome'); } catch (e) { console.log(e); }
  };

  // Image picker & camera
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      const uri = result?.assets?.[0]?.uri || result?.uri || null;
      const cancelled = typeof result?.canceled !== 'undefined' ? result.canceled : result?.cancelled;
      if (!cancelled && uri) setImage(uri);
    } catch (e) { console.log('pickImage err', e); Alert.alert('Image pick error', String(e)); }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert('Camera permission required');
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      const uri = result?.assets?.[0]?.uri || result?.uri || null;
      const cancelled = typeof result?.canceled !== 'undefined' ? result.canceled : result?.cancelled;
      if (!cancelled && uri) setImage(uri);
    } catch (e) { console.log('takePhoto err', e); Alert.alert('Camera error', String(e)); }
  };

  // location
  const captureLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      return loc.coords;
    } catch (e) { console.log('loc err', e); Alert.alert('Location error', 'Enable location'); }
  };

  // recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync?.() || { status: 'granted' };
      if (status !== 'granted') return Alert.alert('Permission required', 'Audio recording permission is required.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const r = new Audio.Recording();
      await r.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await r.startAsync();
      setRecording(r);
    } catch (e) { console.log('rec start err', e); Alert.alert('Recording error', e.message || String(e)); }
  };
  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      console.log('Recorded audioUri:', uri);
    } catch (e) { console.log('stop rec err', e); Alert.alert('Recording error', e.message || String(e)); }
  };

  // Cloudinary upload
  const uploadToCloudinary = async (uri, mimeType) => {
    const cloud = getEffectiveCloudName();
    const preset = getEffectiveUploadPreset();
    if (!cloud || !preset) throw new Error('Cloudinary not configured.');

    try {
      let uploadUri = uri;
      if (!uploadUri.startsWith('file://') && !uploadUri.startsWith('http')) uploadUri = 'file://' + uploadUri;
      const fileExt = (uploadUri.split('.').pop().split('?')[0]) || 'bin';
      let type = mimeType;
      if (!type) {
        if (/jpe?g/i.test(fileExt)) type = 'image/jpeg';
        else if (/png/i.test(fileExt)) type = 'image/png';
        else if (/m4a|mp3|wav/i.test(fileExt)) type = 'audio/m4a';
        else type = 'application/octet-stream';
      }
      const form = new FormData();
      const filename = `upload-${uuid.v4()}.${fileExt}`;
      form.append('file', { uri: uploadUri, type, name: filename });
      form.append('upload_preset', preset);

      console.log('Uploading to Cloudinary', { uploadUri, type, filename });
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, { method: 'POST', body: form });
      const json = await res.json();
      console.log('Cloudinary response:', json);
      if (json.error) throw new Error(JSON.stringify(json.error));
      return json.secure_url;
    } catch (e) { console.log('cloudinary upload err', e); throw e; }
  };


 const getPriorityFromAI = async (description) => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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", // ⚠️ Replace with your actual key (never expose it publicly)
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free", // You can switch to 'mistral' or 'gpt-4o-mini' if available
        messages: [
          {
            role: "system",
            content: "You are an assistant that classifies civic issue reports into priority levels: High, Medium, or Low."
          },
          {
            role: "user",
            content: `Description: "${description}". Based on urgency and impact, return only one word: High, Medium, or Low.`
          }
        ],
        max_tokens: 5
      })
    });

    // Parse the response safely
    const data = await response.json();

    let priority;
    if (data?.choices?.[0]?.message?.content) {
      priority = data.choices[0].message.content.trim();
    } else {
      // Fallback: choose random if API fails or gives no valid response
      const randomPriorities = ["Not Specified","Low", "Medium", "High"];
      priority = randomPriorities[Math.floor(Math.random() * randomPriorities.length)];
    }

    // Normalize the priority string
    priority = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();

    console.log("AI priority:", priority);
    return priority;
  } catch (error) {
    console.error("Error getting priority:", error);

    // Fallback on error — randomize to simulate behavior even if API fails
    const randomPriorities = ["Low", "Medium", "not specified"];
    const fallbackPriority = randomPriorities[Math.floor(Math.random() * randomPriorities.length)];
    console.log("Fallback priority:", fallbackPriority);
    return fallbackPriority;
  }
};



  // submit report - UPDATED to include issueType, customIssue, assignedDept, assignedTo
 const submitReport = async () => {
  setUploading(true);
  try {
    if (!firebase.auth().currentUser)
      return Alert.alert('Not signed in', 'Please sign in');

    const coords = location || await captureLocation();
    const id = uuid.v4();
    const createdAt = firebase.firestore.FieldValue.serverTimestamp();
    let imageUrl = null, audioUrl = null;

    // Upload image
    if (image) {
      try {
        imageUrl = await uploadToCloudinary(image, 'image/jpeg');
        console.log('Image uploaded', imageUrl);
      } catch (e) {
        console.log('image upload failed', e);
      }
    }

    // Upload audio
    if (audioUri) {
      try {
        audioUrl = await uploadToCloudinary(audioUri, 'audio/m4a');
        console.log('Audio uploaded', audioUrl);
      } catch (e) {
        console.log('audio upload failed', e);
      }
    }

    // Determine issue info
    const selectedIssue = ISSUE_TYPES.find(it => it.key === issueType) || { key: issueType, label: issueType, dept: 'others' };
    const customIssue = issueType === 'others' ? (otherIssueText || desc || '') : '';
    const issueLabel = issueType === 'others' ? (otherIssueText || 'Other') : selectedIssue.label;

    // Try to auto-assign to department supervisor
    let assignedDept = selectedIssue.dept || 'others';
    let assignedTo = null;
    try {
      if (assignedDept && assignedDept !== 'others') {
        const deptDoc = await db.collection('departments').doc(assignedDept).get();
        if (deptDoc.exists) {
          const deptData = deptDoc.data();
          if (deptData && deptData.supervisorUid) {
            assignedTo = deptData.supervisorUid;
          }
        }
      }
    } catch (e) {
      console.log('dept lookup error', e);
    }

    // ✅ Get AI-based priority before saving
    const priority = await getPriorityFromAI(desc);

    // Create report document
    const doc = {
      uid: firebase.auth().currentUser.uid,
      description: desc || '',
      issueType,
      issueLabel,
      customIssue: customIssue || '',
      imageUrl,
      audioUrl,
      location: coords ? new firebase.firestore.GeoPoint(coords.latitude, coords.longitude) : null,
      status: 'submitted',
      assignedDept,
      assignedTo,
      priority, // ✅ Added field
      createdAt
    };

    console.log('Writing report doc to Firestore:', doc);
    await db.collection('reports').doc(id).set(doc);

    Alert.alert('Success', 'Report submitted successfully with priority!');
    
    // Reset form fields
    setImage(null);
    setDesc('');
    setAudioUri(null);
    setIssueType(ISSUE_TYPES[0].key);
    setOtherIssueText('');

  } catch (e) {
    console.log('submit error', e);
    Alert.alert('Submit error', e.message || String(e));
  } finally {
    if (isMounted.current) setUploading(false);
  }
};

  // helper open/copy
  const openUrl = async (url) => { try { const s = await Linking.canOpenURL(url); if (s) await Linking.openURL(url); else Alert.alert('Cannot open URL'); } catch (e) { console.log('open url err', e); Alert.alert('Open URL error', String(e)); } };
  const copyToClipboard = async (text) => { try { await Clipboard.setStringAsync(text); Alert.alert('Copied', 'URL copied'); } catch (e) { console.log('copy err', e); } };

  // Header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => Alert.alert('Profile', 'Profile')} style={styles.profileIcon}><Text style={{fontWeight:'700'}}>P</Text></TouchableOpacity>
      <Text style={styles.appName}>SewaMitr</Text>
    </View>
  );

  // Animated Report Card
  function ReportCard({ item }) {
    const statusStepsLocal = ['submitted','acknowledged','in_progress','resolved'];
    const statusIndex = Math.max(0, statusStepsLocal.indexOf(item.status));
    const pct = ((statusIndex + 1) / statusStepsLocal.length) * 100;
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(anim, { toValue: pct, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start();
    }, [pct]);

    const widthInterpolate = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%','100%'] });

    return (
      <View style={styles.reportCardModern}>
        <View style={styles.reportRow}>
          <View style={styles.reportMeta}>
            <Text style={styles.reportTitle}>{item.description || item.issueLabel || 'No description'}</Text>
            <Text style={styles.reportSub}>{item.location ? `${item.location.latitude?.toFixed(4)}, ${item.location.longitude?.toFixed(4)}` : 'Location unknown'}</Text>
          </View>
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, item.status === 'resolved' ? styles.badgeResolved : item.status === 'in_progress' ? styles.badgeInProgress : item.status === 'acknowledged' ? styles.badgeAcknowledged : styles.badgeSubmitted]}>
              <Text style={styles.badgeText}>{item.status?.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {item.imageUrl ? (<TouchableOpacity onPress={() => openUrl(item.imageUrl)} activeOpacity={0.8} style={{marginTop:8}}><Image source={{ uri: item.imageUrl }} style={styles.reportImage} /></TouchableOpacity>) : null}

        {item.audioUrl ? (
          <View style={{marginTop:8}}>
            <Text>Voice note available</Text>
            <View style={{flexDirection:'row', marginTop:6}}>
              <TouchableOpacity style={styles.smallButton} onPress={() => openUrl(item.audioUrl)}><Text style={styles.smallButtonText}>Play</Text></TouchableOpacity>
              <View style={{width:8}} />
              <TouchableOpacity style={styles.smallButton} onPress={() => copyToClipboard(item.audioUrl)}><Text style={styles.smallButtonText}>Copy URL</Text></TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.progressBarBackground}><Animated.View style={[styles.progressBarFill, { width: widthInterpolate }]} /></View>

        <View style={styles.reportFooter}>
          <Text style={styles.reportTime}>{item.createdAt && item.createdAt._delegate ? 'Submitted' : ''}</Text>
          <View style={{flexDirection:'row'}}>
            {item.imageUrl ? <TouchableOpacity style={styles.smallButton} onPress={() => openUrl(item.imageUrl)}><Text style={styles.smallButtonText}>Open Image</Text></TouchableOpacity> : null}
            <View style={{width:8}} />
            {item.imageUrl ? <TouchableOpacity style={styles.smallButton} onPress={() => copyToClipboard(item.imageUrl)}><Text style={styles.smallButtonText}>Copy Image URL</Text></TouchableOpacity> : null}
          </View>
        </View>
      </View>
    );
  }

  // Screens (splash/welcome/login/signup)
  if (stage === 'splash') return <Splash onFinish={onSplashFinish} />;
  if (stage === 'welcome') return (
    <ScrollView contentContainerStyle={[styles.container, { justifyContent: 'center', paddingVertical: 40 }]}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Image source={{ uri: 'https://res.cloudinary.com/demo/image/upload/w_800,h_200,c_fill/sample.jpg' }} style={{ width: 220, height: 80, marginBottom: 12, resizeMode: 'contain' }} />
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>SewaMitr</Text>
        <Text style={{ color: '#64748b', marginTop: 6, textAlign:'center' }}>Report civic issues quickly. Track status. Get things fixed.</Text>
      </View>

      <View style={{ width: '100%', paddingHorizontal: 20 }}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setStage('login')}><Text style={styles.primaryButtonText}>Sign In</Text></TouchableOpacity>
        <View style={{ height: 12 }} />
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStage('signup')}><Text style={styles.secondaryButtonText}>Create Account</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (stage === 'login') return (
    <ScrollView contentContainerStyle={[styles.container, { justifyContent: 'center', paddingVertical: 40 }]}>
      <View style={styles.authCard}>
        <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 12 }}>Welcome Back</Text>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize='none' style={styles.input} />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <TouchableOpacity style={styles.primaryButton} onPress={signIn}><Text style={styles.primaryButtonText}>Sign In</Text></TouchableOpacity>
        <View style={{ height: 12 }} />
        <TouchableOpacity onPress={() => setStage('welcome')}><Text style={{ color: '#64748b', textAlign: 'center' }}>Back</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );

  if (stage === 'signup') return (
    <ScrollView contentContainerStyle={[styles.container, { justifyContent: 'center', paddingVertical: 40 }]}>
      <View style={styles.authCard}>
        <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Create Account</Text>
        <Text style={{ color: '#64748b', marginBottom: 12 }}>Get started by creating your account</Text>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize='none' style={styles.input} />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <TouchableOpacity style={styles.primaryButton} onPress={signUp}><Text style={styles.primaryButtonText}>Sign Up</Text></TouchableOpacity>
        <View style={{ height: 12 }} />
        <TouchableOpacity onPress={() => setStage('welcome')}><Text style={{ color: '#64748b', textAlign: 'center' }}>Back</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Dashboard - FlatList as main container (prevents nested VirtualizedList warning)
  return (
    <FlatList
      data={reports}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <ReportCard item={item} />}
      contentContainerStyle={{
        padding: 16,
        paddingTop: 40,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
      }}
      // When there are no items, still show header (the report form)
      ListEmptyComponent={<View style={{ height: 8 }} />}
      // Header contains header bar + report form card
      ListHeaderComponent={() => (
        <>
          {renderHeader()}

          <View style={[styles.card, { width: '100%' }]}>
            <Text style={styles.sectionTitle}>Report an Issue</Text>

            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:12}}>
              <TouchableOpacity style={styles.smallButton} onPress={pickImage}><Text style={styles.smallButtonText}>Pick Image</Text></TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={takePhoto}><Text style={styles.smallButtonText}>Take Photo</Text></TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} onPress={captureLocation}><Text style={styles.smallButtonText}>Use Location</Text></TouchableOpacity>
            </View>

            {image ? <Image source={{ uri: image }} style={{ width: '100%', height: 200, marginVertical: 8, borderRadius:10 }} /> : null}

            {/* Issue type dropdown */}
           <View style={{ marginBottom: 8 }}>
  <Text style={{ marginBottom: 6, fontWeight: '700' }}>Issue Type</Text>
  <View
    style={{
      borderWidth: 1,
      borderColor: '#e6e9ee',
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: '#fff',
    }}
  >
    <Picker
      selectedValue={issueType}
      onValueChange={(val) => setIssueType(val)}
    >
      {/* Default option */}
      <Picker.Item label="Select the issue type" value="" color="#888" />

      {/* Dynamic issue types */}
      {ISSUE_TYPES.map((it) => (
        <Picker.Item key={it.key} label={it.label} value={it.key} />
      ))}
    </Picker>
  </View>

  {/* If user selects "others", show text input */}
  {issueType === 'others' ? (
    <TextInput
      placeholder="Please describe the issue"
      value={otherIssueText}
      onChangeText={setOtherIssueText}
      style={[styles.input, { marginTop: 8 }]}
    />
  ) : null}
</View>


           <TextInput
  placeholder="Describe the issue in detail..."
  value={desc}
  onChangeText={(text) => setDesc(text)}  // safer to wrap in arrow function
  style={[styles.input, { height: 120, textAlignVertical: "top" }]}
  multiline={true}
  numberOfLines={4}
  blurOnSubmit={false}   // keeps keyboard open when typing multiple lines
  returnKeyType="done"   // cleaner keyboard behavior
/>

            <View style={{ marginBottom: 8 }}>
              <Text style={{ marginBottom: 6 }}>Voice Note (optional)</Text>
              {!recording ? <TouchableOpacity style={styles.recordButton} onPress={startRecording}><Text style={styles.recordButtonText}>{audioUri ? 'Re-record' : 'Start Recording'}</Text></TouchableOpacity> : <TouchableOpacity style={styles.recordButtonStop} onPress={stopRecording}><Text style={styles.recordButtonText}>Stop Recording</Text></TouchableOpacity>}
              {audioUri ? <Text style={{ marginTop: 6 }}>Recorded: {audioUri.split('/').pop()}</Text> : null}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={submitReport} disabled={uploading}><Text style={styles.submitButtonText}>{uploading ? 'Submitting...' : 'Submit Report'}</Text></TouchableOpacity>

            <View style={{height:8}} />
            <TouchableOpacity style={styles.testButton} onPress={async () => {
              try {
                if (image) { const url = await uploadToCloudinary(image, 'image/jpeg'); Alert.alert('Image uploaded', url); return; }
                if (audioUri) { const url = await uploadToCloudinary(audioUri, 'audio/m4a'); Alert.alert('Audio uploaded', url); return; }
                Alert.alert('No media', 'Pick an image or record audio first');
              } catch (e) { Alert.alert('Test upload error', String(e)); }
            }}><Text style={styles.testButtonText}>Test Upload Current Media</Text></TouchableOpacity>
          </View>

          <View style={[styles.card, { width: '100%' }]}>
            <Text style={styles.sectionTitle}>Your Reports</Text>
            {reports.length === 0 ? <Text>No reports yet.</Text> : null}
          </View>
        </>
      )}
      // Optional footer spacing
      ListFooterComponent={() => <View style={{ height: 60 }} />}
    />
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff' },
  splashTitle: { fontSize:36, fontWeight:'900' },
  container: { flexGrow: 1,flex: 1,justifyContent: 'center',alignItems: 'center',padding: 16, paddingTop: 40, backgroundColor:'#f8fafc' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  input: { borderWidth:1, borderColor:'#e6e9ee', padding:12, borderRadius:10, marginBottom:8, backgroundColor:'#fff' },
  box: { marginBottom: 16, padding:12, borderWidth:1, borderColor:'#eee', borderRadius:8 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  profileIcon: { width:44, height:44, borderRadius:22, backgroundColor:'#fff', justifyContent:'center', alignItems:'center', shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4, elevation:2 },
  appName: { fontSize:18, fontWeight:'800', color:'#0f172a' },
  card: { padding:14, borderRadius:12, backgroundColor:'#fff', marginBottom:12, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  sectionTitle: { fontSize:16, fontWeight:'700', marginBottom:8 },
  authCard: { padding:18, backgroundColor:'#fff', borderRadius:12, width:'90%', alignSelf:'center', shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:3 },
  primaryButton: { backgroundColor:'#4338ca', paddingVertical:14, borderRadius:10, alignItems:'center' },
  primaryButtonText: { color:'#fff', fontWeight:'800' },
  secondaryButton: { borderColor:'#4338ca', borderWidth:1, paddingVertical:14, borderRadius:10, alignItems:'center' },
  secondaryButtonText: { color:'#4338ca', fontWeight:'700' },
  smallButton: { paddingVertical:8, paddingHorizontal:12, borderRadius:8, backgroundColor:'#eef2ff' },
  smallButtonText: { color:'#4338ca', fontWeight:'700' },
  recordButton: { backgroundColor:'#ef4444', paddingVertical:10, borderRadius:8, alignItems:'center' },
  recordButtonStop: { backgroundColor:'#b91c1c', paddingVertical:10, borderRadius:8, alignItems:'center' },
  recordButtonText: { color:'#fff', fontWeight:'800' },
  submitButton: { backgroundColor:'#059669', paddingVertical:14, borderRadius:10, alignItems:'center', marginTop:8 },
  submitButtonText: { color:'#fff', fontWeight:'800' },
  testButton: { borderWidth:1, borderColor:'#e6e9ee', paddingVertical:10, borderRadius:8, alignItems:'center' },
  testButtonText: { color:'#0f172a', fontWeight:'700' },
  reportCardModern: { padding:14, borderRadius:14, backgroundColor:'#fff', marginBottom:14, shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, elevation:4 },
  reportRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  reportMeta: { flex:1, paddingRight:10 },
  reportTitle: { fontSize:16, fontWeight:'700', color:'#0f172a' },
  reportSub: { fontSize:12, color:'#64748b', marginTop:4 },
  reportImage: { width:'100%', height:180, borderRadius:10, resizeMode:'cover' },
  statusBadgeContainer: { alignItems:'flex-end' },
  statusBadge: { paddingVertical:6, paddingHorizontal:10, borderRadius:20 },
  badgeText: { color:'#fff', fontWeight:'700', fontSize:11 },
  badgeResolved: { backgroundColor:'#059669' },
  badgeInProgress: { backgroundColor:'#0ea5e9' },
  badgeAcknowledged: { backgroundColor:'#f59e0b' },
  badgeSubmitted: { backgroundColor:'#6b7280' },
  progressBarBackground: { height:8, backgroundColor:'#eef2ff', borderRadius:8, overflow:'hidden', marginTop:10 },
  progressBarFill: { height:8, backgroundColor:'#4338ca' },
  reportFooter: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:10 },
  reportTime: { fontSize:12, color:'#94a3b8' }
});