import React, { useState, useEffect } from "react";
import { getFirestore, doc, updateDoc, onSnapshot, getDoc, collection, query, where, getDocs, setDoc, limit } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import app from "../../firebase";
import { useNavigate, useLocation } from "react-router-dom";
import CourseLineup from "./CourseLineup";
import StudentFinance from "./StudentFinance";
import FinalEnrollment from "./FinalEnrollment";
import PreRegistrationProfileInfo from "./PreRegistration";

const SIDEBAR_BUTTONS = [
  { key: "home", label: "Home" },
  { key: "assessment", label: "Assessment" },
  { key: "pre-registration", label: "Pre-Registration" },
  { key: "course-lineup", label: "Course Line-up" },
  { key: "finances", label: "Finances" },
  { key: "final-enrollment", label: "Finalization of Enrollment" }, 
];

export default function StudentDashboard({ student, onLogout }) {
  // Announcement and enrollment window
  const [announcement, setAnnouncement] = useState("");
  const [enrollmentStart, setEnrollmentStart] = useState("");
  const [enrollmentEnd, setEnrollmentEnd] = useState("");
  const [appointmentStart, setAppointmentStart] = useState("");
  const [appointmentEnd, setAppointmentEnd] = useState("");

  useEffect(() => {
    const db = getFirestore(app);
    const announcementRef = doc(db, "systemSettings", "announcement");
    const unsub = onSnapshot(announcementRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAnnouncement(data.announcement || "");
        setEnrollmentStart(data.enrollmentStart || "");
        setEnrollmentEnd(data.enrollmentEnd || "");
        setAppointmentStart(data.appointmentStart || "");
        setAppointmentEnd(data.appointmentEnd || "");
      }
    });
    return () => unsub();
  }, []);

  const isEnrollmentOpen = () => {
    if (!enrollmentStart || !enrollmentEnd) return false;
    const start = new Date(enrollmentStart);
    const end = new Date(enrollmentEnd);
    const now = new Date();
    return now >= start && now <= end;
  };

  const isAppointmentOpen = () => {
    if (!appointmentStart || !appointmentEnd) return false;
    const start = new Date(appointmentStart);
    const end = new Date(appointmentEnd);
    const now = new Date();
    return now >= start && now <= end;
  };

  // computed flags used across the component (avoid repeated function calls and keep readability)
  const enrollmentOpenFlag = isEnrollmentOpen();
  const appointmentOpenFlag = isAppointmentOpen();
  const location = useLocation();
  const initialActive = location.state?.active || "home";
  const [active, setActive] = useState(initialActive);
  // Track local schedules state to enable Finances immediately after SUBMIT
  const [localSchedules, setLocalSchedules] = useState(student.schedules || []);
  const [lineupSubmitted, setLineupSubmitted] = useState(false);
  const navigate = useNavigate();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [assessmentSchedule, setAssessmentSchedule] = useState(null); // { date, time }
  const [assessmentStatus, setAssessmentStatus] = useState(student.appointment?.status);
  const [canPreRegister, setCanPreRegister] = useState(
    String(student.appointment?.status || "").trim().toLowerCase() === "approved"
  );
  const [preRegistrationStatus, setPreRegistrationStatus] = useState(student.preRegistrationStatus);
  const [hasCor, setHasCor] = useState(false);
  const [canFinalize, setCanFinalize] = useState(false);

  // NEW: track registrationStatus (persisted in Firestore) so page reload still knows if line-up was submitted
  const [registrationStatus, setRegistrationStatus] = useState(student.registrationStatus || null);

  // NEW: add missing state variables for FinalEnrollment
  const [localStudent, setLocalStudent] = useState(student);
  const [miscFees, setMiscFees] = useState([]);
  const [cashDiscount, setCashDiscount] = useState(0);
  const [cashWithDiscountDate, setCashWithDiscountDate] = useState("");
  const [cashWithoutDiscountDate, setCashWithoutDiscountDate] = useState("");
  const [installmentDates, setInstallmentDates] = useState([]);

  // Real-time Firestore listener for student document (listen by idNumber field)
  useEffect(() => {
    if (!student?.idNumber) {
      console.log('Student idNumber not available yet, skipping listener');
      return;
    }
    const db = getFirestore(app);
    console.log('Setting up query listener for student idNumber:', student.idNumber); // DEBUG

    const q = query(collection(db, "students"), where("idNumber", "==", student.idNumber), limit(1));
    const unsubscribe = onSnapshot(q, (snap) => {
      console.log('Query listener fired, empty:', snap.empty); // DEBUG
      if (snap.empty) {
        // No matching document
        setAssessmentSchedule(null);
        setAssessmentStatus(undefined);
        setCanPreRegister(false);
        setPreRegistrationStatus(undefined);
        setLocalSchedules([]);
        return;
      }
      const docSnap = snap.docs[0];
      const data = docSnap.data();
      console.log('Student doc from query:', docSnap.id, data); // DEBUG

      // Keep a local copy of the full student doc so UI updates (profile picture etc.) reflect immediately
      setLocalStudent({ id: docSnap.id, ...data });

      // Update assessmentSchedule
      if (data.appointment && data.appointment.date && data.appointment.time) {
        setAssessmentSchedule({ date: data.appointment.date, time: data.appointment.time });
      } else {
        setAssessmentSchedule(null);
      }

      const status = String(data.appointment?.status || "").trim().toLowerCase();
      setAssessmentStatus(data.appointment?.status);
      setCanPreRegister(status === "approved");
      setPreRegistrationStatus(data.preRegistrationStatus);
      setLocalSchedules(data.schedules || []);

      // NEW: persist registrationStatus from Firestore and derive lineupSubmitted
      setRegistrationStatus(data.registrationStatus || null);
      // if backend stored registrationStatus === "submitted", reflect that immediately
      if (String(data.registrationStatus || "").toLowerCase() === "submitted") {
        setLineupSubmitted(true);
      }

      // new: normalize detection of COR presence
      const hasCor = Boolean(
        data.corPdfUrl ||
        data.corUrl ||
        data.requirements?.corUploaded ||
        (Array.isArray(data.requirements) && data.requirements.includes('cor'))
      );
      setHasCor(hasCor);
      // compute finalization readiness
      const canFinalize = (
        String(data.appointment?.status || '').toLowerCase() === 'approved' &&
        (String(data.preRegistrationStatus || '').toLowerCase() === 'submitted' || data.preRegistrationStatus === 'complete') &&
        hasCor &&
        (String(data.financeStatus || '').toLowerCase() === 'paid' || data.financeStatus === 'fully paid')
      );
      setCanFinalize(Boolean(canFinalize));
    });

    return () => unsubscribe();
  }, [student?.idNumber]);  // CHANGE THIS dependency too
  const formatTime = (time) => {
    if (time === "am") return "AM 9:00-12:00";
    if (time === "pm") return "PM 1:30-4:30";
    return "-";
  };

  // Add missing formatDate function
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };
  // Prefer localStudent profilePicUrl when available so header updates immediately after edit
  const profilePicUrl = localStudent?.profilePicUrl || student?.profilePicUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent((localStudent?.firstName || student?.firstName || '') + ' ' + (localStudent?.lastName || student?.lastName || ''));
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editFile, setEditFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePassMsg, setChangePassMsg] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const handleProfileMenu = (action) => {
    setProfileMenuOpen(false);
    if (action === "logout") return onLogout && onLogout();
    if (action === "password") return setChangePassOpen(true);
    if (action === "edit") return setEditProfileOpen(true);
  };

  async function changePasswordNow() {
    setChangePassMsg("");
    if (!currentPassword || !newPassword) {
      setChangePassMsg("Enter current and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassMsg("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setChangePassMsg("Password should be at least 6 characters.");
      return;
    }

    setChangingPass(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("No authenticated user found.");
      // Reauthenticate
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      // Update password
      await updatePassword(user, newPassword);
      setChangePassMsg("Password updated successfully.");
      // clear and close after short delay
      setTimeout(() => {
        setChangePassOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setChangePassMsg("");
      }, 1200);
    } catch (err) {
      console.error("changePasswordNow error:", err);
      // Provide helpful messages for common errors
      if (err?.code === "auth/wrong-password") setChangePassMsg("Current password is incorrect.");
      else setChangePassMsg(err?.message || "Unable to change password.");
    } finally {
      setChangingPass(false);
    }
  }

  // Fetch miscellaneous fees
  useEffect(() => {
    const db = getFirestore(app);
    const feesRef = doc(db, "systemSettings", "miscellaneousFees");
    const unsub = onSnapshot(feesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMiscFees(data.fees || []);
        setCashDiscount(data.cashDiscount || 0);
        setCashWithDiscountDate(data.cashWithDiscountDate || "");
        setCashWithoutDiscountDate(data.cashWithoutDiscountDate || "");
        setInstallmentDates(data.installmentDates || []);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", flexDirection: "row" }}>
      {/* Sidebar (left) */}
      <div style={{ width: 220, background: "#155c2b", color: "#fff", display: "flex", flexDirection: "column", alignItems: "stretch", padding: "32px 0", minHeight: "100vh" }}>
        <div style={{ fontWeight: 700, fontSize: 22, textAlign: "center", marginBottom: 40, letterSpacing: 2 }}>ENROLLEASE</div>
        {/* No announcement/enrollment status in sidebar. */}
        {SIDEBAR_BUTTONS.map(btn => {
          // Determine disabled and opacity logic for each step
          let disabled = false;
          let cursor = "pointer";
          let opacity = 1;
          if (btn.key === "pre-registration" && (!canPreRegister || !enrollmentOpenFlag)) {
            disabled = true;
            cursor = "not-allowed";
            opacity = 0.5;
          }
          if (btn.key === "course-lineup") {
            // Only enable if pre-registration is submitted and enrollment is open
            if (preRegistrationStatus !== "submitted" || !enrollmentOpenFlag) {
              disabled = true;
              cursor = "not-allowed";
              opacity = 0.5;
            }
          }
          if (btn.key === "finances") {
            // Only enable if Course Line-up has been submitted (either in this session via lineupSubmitted
            // or persisted in Firestore via registrationStatus === "submitted") and enrollment is open
            const lineupDone = lineupSubmitted || String(registrationStatus || '').toLowerCase() === 'submitted';
            if (!lineupDone || !enrollmentOpenFlag || preRegistrationStatus !== "submitted") {
              disabled = true;
              cursor = "not-allowed";
              opacity = 0.5;
            }
          }
          if (btn.key === "assessment") {
            // Disable if enrollment is closed
            if (!enrollmentOpenFlag) {
              disabled = true;
              cursor = "not-allowed";
              opacity = 0.5;
            }
          }
          if (btn.key === "final-enrollment") {
            // Only enable if hasCor is true (updated in real-time)
            if (!hasCor) {
              disabled = true;
              cursor = "not-allowed";
              opacity = 0.5;
            }
          }
          return (
            <button
              key={btn.key}
              onClick={() => {
                if (disabled) return;
                setActive(btn.key);
              }}
              style={{
                background: active === btn.key ? "#e67e22" : "transparent",
                color: active === btn.key ? "#fff" : "#fff",
                border: "none",
                borderRadius: 0,
                padding: "16px 0",
                fontWeight: 600,
                fontSize: 17,
                cursor,
                textAlign: "left",
                paddingLeft: 32,
                transition: "background 0.2s",
                opacity
              }}
              disabled={disabled}
            >
              {btn.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {/* Remove old LOG OUT button, now in header dropdown */}
      </div>

      {/* Main area: header at top, content below */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Header (top, profile on right) */}
        <div style={{ height: 80, background: "#fff", display: "flex", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "0 40px", position: "relative", zIndex: 10, justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 16, fontWeight: 600, fontSize: 18, color: "#155c2b" }}>{student.firstName} {student.lastName}</span>
            <img
              src={profilePicUrl}
              alt="Profile"
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", cursor: "pointer", border: "2px solid #e67e22" }}
              onClick={() => setProfileMenuOpen((v) => !v)}
            />
          </div>
          {/* Profile Dropdown */}
          {profileMenuOpen && (
            <div style={{ position: "absolute", top: 60, right: 40, background: "#fff", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.13)", minWidth: 210, padding: "10px 0", zIndex: 100 }}>
              <div style={{ padding: "10px 24px", cursor: "pointer", color: "#222", fontWeight: 500 }} onClick={() => handleProfileMenu("edit")}>Edit Profile</div>
              <div style={{ padding: "10px 24px", cursor: "pointer", color: "#222", fontWeight: 500 }} onClick={() => handleProfileMenu("password")}>Change Password</div>
              <div style={{ height: 1, background: "#eee", margin: "6px 0" }} />
              <div style={{ padding: "10px 24px", cursor: "pointer", color: "#e67e22", fontWeight: 600 }} onClick={() => handleProfileMenu("logout")}>Log out</div>
            </div>
          )}

          {/* Edit Profile Modal */}
          {editProfileOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
              <div style={{ width: 520, background: "#fff", borderRadius: 12, padding: 24 }}>
                <h3 style={{ marginTop: 0 }}>Edit Profile</h3>
                <div style={{ height: 1, background: "#eee", margin: "12px 0" }} />
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 12 }}>
                  <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', border: '2px solid #e67e22' }}>
                    <img src={previewUrl || localStudent?.profilePicUrl || profilePicUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1 }}>
  
                    <div>
                      <label style={{ fontWeight: 500 }}>Profile picture</label>
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) {
                          // Simple client-side validation: limit to 5MB
                          if (f.size > 5 * 1024 * 1024) {
                            setEditMsg('Please select an image smaller than 5 MB.');
                            return;
                          }
                          setEditFile(f);
                          const url = URL.createObjectURL(f);
                          setPreviewUrl(url);
                        }
                      }} style={{ display: 'block', marginTop: 8 }} />
                      <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Accepted: JPG/PNG. Max size 5 MB. Image will be resized before upload.</div>
                    </div>
                    {editMsg && <div style={{ marginTop: 8, color: editMsg.includes('success') ? 'green' : 'red' }}>{editMsg}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button onClick={() => { setEditProfileOpen(false); setEditFile(null); setPreviewUrl(''); setEditMsg(''); }} style={{ padding: '8px 14px' }}>Cancel</button>
                  <button onClick={async () => {
                    try {
                      setEditMsg('');
                      setUploading(true);
                      const db = getFirestore(app);
                      // resolve student doc by idNumber
                      let studentRef = null;
                      const q = query(collection(db, 'students'), where('idNumber', '==', student.idNumber), limit(1));
                      const snap = await getDocs(q);
                      if (!snap.empty) studentRef = snap.docs[0].ref;
                      else studentRef = doc(db, 'students', student.idNumber);

                      let profileUrl = localStudent?.profilePicUrl || null;
                      if (editFile) {
                        // Resize image client-side before uploading
                        const resizedBlob = await (async (file) => {
                          const img = document.createElement('img');
                          img.src = URL.createObjectURL(file);
                          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
                          const maxDim = 512;
                          let { width, height } = img;
                          const ratio = Math.min(maxDim / width, maxDim / height, 1);
                          width = Math.round(width * ratio);
                          height = Math.round(height * ratio);
                          const canvas = document.createElement('canvas');
                          canvas.width = width;
                          canvas.height = height;
                          const ctx = canvas.getContext('2d');
                          ctx.drawImage(img, 0, 0, width, height);
                          const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
                          URL.revokeObjectURL(img.src);
                          return blob;
                        })(editFile);

                        const storage = getStorage(app);
                        const sRef = storageRef(storage, `students/${studentRef.id || student.idNumber}/profile_${Date.now()}.jpg`);
                        await uploadBytes(sRef, resizedBlob);
                        profileUrl = await getDownloadURL(sRef);
                      }

                      await updateDoc(studentRef, { profilePicUrl: profileUrl });
                      setEditMsg('Profile updated successfully.');
                      // update local student immediately
                      setLocalStudent(s => ({ ...(s || {}), profilePicUrl: profileUrl }));
                      setTimeout(() => {
                        setEditProfileOpen(false);
                        setEditFile(null);
                        if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }
                        setEditMsg('');
                      }, 900);
                    } catch (err) {
                      console.error('Error updating profile:', err);
                      setEditMsg(err?.message || 'Failed to update profile.');
                    } finally { setUploading(false); }
                  }} style={{ padding: '8px 14px', background: '#155c2b', color: '#fff', border: 'none', borderRadius: 6 }}>{uploading ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            </div>
          )}

          {changePassOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
              <div style={{ width: 420, background: "#fff", borderRadius: 12, padding: 24 }}>
                <h3 style={{ marginTop: 0 }}>Change password</h3>
                <div style={{ height: 1, background: "#eee", margin: "12px 0" }} />
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontWeight: 500 }}>Current password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontWeight: 500 }}>New password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontWeight: 500 }}>Confirm new password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
                </div>
                {changePassMsg && <div style={{ marginTop: 12, color: changePassMsg.includes('success') || changePassMsg.includes('sent') ? 'green' : 'red' }}>{changePassMsg}</div>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                  <button onClick={() => { setChangePassOpen(false); setChangePassMsg(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }} style={{ padding: "8px 14px" }}>Cancel</button>
                  <button onClick={changePasswordNow} disabled={changingPass} style={{ padding: "8px 14px", background: "#155c2b", color: "#fff", border: "none", borderRadius: 6 }}>{changingPass ? "Saving..." : "Change password"}</button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: 40, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          {active === "home" && (
            <div>
              {/* Information Section */}
              <div style={{ background: '#f8fafb', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', marginBottom: 24, border: '1px solid #e5e7eb' }}>
                <div style={{ background: '#e8e8e8', color: '#155c2b', fontWeight: 700, fontSize: 22, padding: '12px 24px', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>Information</div>
                <div style={{ padding: '24px 32px', fontSize: 16, color: '#222' }}>
                  <div style={{ marginBottom: 6 }}><b>Full Name:</b> {student.firstName}, {student.lastName}</div>
                  <div style={{ marginBottom: 6 }}><b>ID Number:</b> {student.idNumber}</div>
                  <div><b>Program:</b> {student.program}</div>  
                </div>
              </div>
          {/* Announcement Section (now includes announcement and enrollment status) */}
          <div style={{ background: '#f8fafb', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', border: '1px solid #e5e7eb' }}>
            <div style={{ background: '#e8e8e8', color: '#155c2b', fontWeight: 700, fontSize: 22, padding: '12px 24px', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>Announcement</div>
            <div style={{ padding: '32px 32px 16px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 180, position: 'relative' }}>
              <div style={{ background: '#fffbe6', color: '#b26a00', border: '1px solid #ffe58f', borderRadius: 8, padding: '16px 24px', fontWeight: 600, fontSize: 17, textAlign: 'center', marginBottom: 24 }}>
                {announcement || "No announcement at this time."}
                <div style={{ fontWeight: 500, fontSize: 15, marginTop: 6, color: enrollmentOpenFlag ? '#18803b' : '#b71c1c' }}>
                  Enrollment is {enrollmentOpenFlag ? 'OPEN' : 'CLOSED'}
                </div>
              </div>
              {/* When enrollment is closed, hide all other announcement content below */}
              {enrollmentOpenFlag ? (
                <>
                  {/* Show Profile Information Complete after pre-registration is done (real-time) */}
                  {canFinalize ? (
                    <>
                      <div style={{ fontSize: 22, color: '#0e0d0d', fontWeight: 500, marginBottom: 24, marginTop: 30, textAlign: 'center' }}>
                        You are now officially enrolled! Please check your email for your student portal.
                      </div>
                    </>
                  ) : preRegistrationStatus === "submitted" ? (
                     <>
                       <div style={{ fontSize: 22, color: '#0e0d0dff', fontWeight: 500, marginBottom: 24, marginTop: 30, textAlign: 'center' }}>
                         {lineupSubmitted ? (
                           <>Your miscellaneous fees is now available. Please review your Finance</>
                         ) : localSchedules && localSchedules.length > 0 ? (
                           <>Profile Information Complete.</>
                         ) : (
                           <>
                             Profile Information Complete.<br />
                             Please wait for your Course Line-up.
                           </>
                         )}
                       </div>
                     </>
                   ) : assessmentStatus === "approved" ? (
                     <>
                       <div style={{ fontSize: 22, color: '#1a2b3c', fontWeight: 500, marginBottom: 24, marginTop: 30, textAlign: 'center' }}>
                         Your assessment has been approved.
                       </div>
                       <button
                         style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 4, padding: '12px 32px', marginBottom: 40, fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.07)' }}
                         onClick={() => setActive('pre-registration')}
                       >
                         PROCEED TO ENROLLMENT
                       </button>
                       {/* schedule card intentionally removed when approved */}
                     </>
                   ) : assessmentStatus === "disapproved" ? (
                     <>
                       <div style={{ fontSize: 22, color: '#b71c1c', fontWeight: 500, marginBottom: 24, marginTop: 30, textAlign: 'center' }}>
                         We regret to inform you that your assessment has been disapproved.<br />
                         You can retry your exam by booking an new appointment in Assessment.<br />
                         Please contact the Guidance Office for more information.<br />
                         <b>guidance@mac.com</b>
                       </div>
                     </>
                   ) : (assessmentSchedule && assessmentStatus !== "disapproved") ? (
                    <div style={{ width: '100%' }}>
                      <div style={{ fontWeight: 600, color: "#155c2b", fontSize: 20, marginBottom: 30, marginTop: 30, textAlign: 'center' }}>Competency Assessment Schedule</div>
                      <div style={{ fontSize: 16, marginBottom: 10, textAlign: 'center' }}><b>Date:</b> {formatDate(assessmentSchedule.date)}</div>
                      <div style={{ fontSize: 16, marginBottom: 10, textAlign: 'center' }}><b>Time:</b> {formatTime(assessmentSchedule.time)}</div>
                      <div style={{ fontSize: 16, marginBottom: 10, textAlign: 'center' }}><b>Place:</b> Guidance Services Office Manila Adventist College</div>
                      <div style={{ fontSize: 16, marginBottom: 10, textAlign: 'center' }}><b>Address:</b> 1975 San Juan, Pasay City, 1300 Kalakhang Manila</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 22, color: '#1a2b3c', fontWeight: 500, marginBottom: 24, marginTop: 30,  textAlign: 'center' }}>
                        Assessment is now open for AY 2025-2026-First Semester
                      </div>
                      <button
                        style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 4, padding: '12px 32px', marginBottom: 40, fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.07)' }}
                        onClick={() => setActive('assessment')}
                      >
                        PROCEED TO ASSESSMENT
                      </button>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </div>
            </div>
          )}
          {/* Schedule Modal */}
          {showScheduleModal && (
            <BookAssessmentModal
              studentId={student.idNumber}
              appointmentStart={appointmentStart}
              appointmentEnd={appointmentEnd}
              onClose={async (date, time) => {
                setShowScheduleModal(false);
              }}
            />
          )}
          {/* Placeholder for other sections */}
          {active === "assessment" && (
            <div>
              {/* Competency Assessment and Schedule Side by Side */}
              <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
                {/* Competency Assessment Section */}
                <div style={{ flex: 1, background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: 32 }}>
                  <h3 style={{ color: "#155c2b", fontWeight: 700, marginBottom: 18, fontSize: 19 }}>Competency Assessment</h3>
                  <div style={{ fontSize: 16, color: "#222" }}>
                    <ul style={{ margin: "12px 0 0 18px" }}>
                      <li>
                        {assessmentSchedule == null || assessmentStatus === "disapproved" ? (
                          <>
                            Choose your preferred schedule <span style={{ color: "#fff", background: "#ff9800", borderRadius: 4, padding: "2px 8px", fontSize: 13, cursor: "pointer" }} onClick={() => setShowScheduleModal(true)}>here</span>
                          </>
                        ) : (
                          <>You have already booked your schedule.</>
                        )}
                      </li>
                      <li>On your approved schedule, proceed first to the <b>Finances</b>, onsite payment only (Php 500).</li>
                      <li>Show your receipt to the Guidance Services Office for the Competency Assessment.</li>
                      <li>Once you're done with the assessment, you can continue your enrollment.</li>
                    </ul>
                    <div style={{ fontSize: 13, color: "#888", marginTop: 18 }}>
                      For inquiry about the Competency Assessment, contact the Guidance Services Office.<br />
                      <span>
                        <b>macpsychcenter@mac.edu.ph</b>
                        <br />
                        Telephone: 02-8525-9191 local 281
                      </span>
                    </div>    
                  </div>
                </div>
                {/* Assessment Schedule Card */}
                {assessmentSchedule && (
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 8,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                      padding: 24,
                      minWidth: 400,
                      maxWidth: 500,
                      alignSelf: 'stretch',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#155c2b", fontSize: 20, marginBottom: 50, marginTop: 30 }}>Competency Assessment Schedule</div>
                    <div style={{ fontSize: 16, marginBottom: 10 }}><b>Date:</b> {formatDate(assessmentSchedule.date)}</div>
                    <div style={{ fontSize: 16, marginBottom: 10 }}><b>Time:</b> {formatTime(assessmentSchedule.time)}</div>
                    <div style={{ fontSize: 16, marginBottom: 10 }}><b>Place:</b> Guidance Services Office Manila Adventist College</div>
                    <div style={{ fontSize: 16,  marginBottom: 50 }}><b>Address:</b> 1975 San Juan, Pasay City, 1300 Kalakhang Manila</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {active === "pre-registration" && (
            <PreRegistrationProfileInfo studentId={student.idNumber} setActive={setActive} />
          )}
          {active === "course-lineup" && (
            <CourseLineup studentId={student.idNumber} onSubmit={() => {
              setLineupSubmitted(true);
              setActive("finances");
              setLocalSchedules((prev) => prev && prev.length > 0 ? prev : [{}]);
            }} />
          )}
          {active === "finances" && (
            <StudentFinance studentId={student.idNumber} />
          )}
          {active === "final-enrollment" && (
            <FinalEnrollment
      student={localStudent}  // CHANGE from student to localStudent
      miscFees={miscFees}
      cashDiscount={cashDiscount}
      cashWithDiscountDate={cashWithDiscountDate}
      cashWithoutDiscountDate={cashWithoutDiscountDate}
      installmentDates={installmentDates}
    />
          )} 
        </div>
      </div>
    </div>
  );
}


// Modal for booking assessment schedule
function BookAssessmentModal({ onClose, studentId, appointmentStart, appointmentEnd }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isFriday, setIsFriday] = useState(false);

  // Compute the earliest selectable date based on the appointment window and current time.
  const computeEarliestDate = () => {
    const now = new Date();
    const start = appointmentStart ? new Date(appointmentStart) : null;
    const end = appointmentEnd ? new Date(appointmentEnd) : null;

    const toLocalDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const pad = (n) => String(n).padStart(2, '0');
    const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const today = toLocalDate(now);
    let candidate = start ? toLocalDate(start) : today;
    if (candidate < today) candidate = today;

    const dayHasSlot = (dateObj) => {
      const day = dateObj.getDay();
      if (day === 0 || day === 6) return false; // weekend

      // Determine allowed slots considering appointment window times
      let allowAM = true;
      let allowPM = true;

      // If appointmentStart is on this day and starts after AM end, AM is not available
      if (start && toLocalDate(start).getTime() === dateObj.getTime()) {
        const sH = start.getHours();
        const sM = start.getMinutes();
        if (sH > 12 || (sH === 12 && sM > 0)) allowAM = false;
        // If starts after PM end, PM not available
        if (sH > 16 || (sH === 16 && sM > 30)) allowPM = false;
      }

      // If date is today, consider current time (an expired slot should not be shown)
      if (dateObj.getTime() === today.getTime()) {
        const noon = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 12, 0, 0);
        const pmEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 16, 30, 0);
        if (now >= noon) allowAM = false;
        if (now >= pmEnd) allowPM = false;
      }

      // Fridays: PM not allowed by policy
      if (day === 5) allowPM = false;

      return allowAM || allowPM;
    };

    // Advance candidate until a day with at least one slot is found or we exceed end date
    while (end && candidate.getTime() <= toLocalDate(end).getTime() && !dayHasSlot(candidate)) {
      candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
    }

    const noAvailable = end && candidate.getTime() > toLocalDate(end).getTime();
    return { dateStr: formatLocal(candidate), noAvailable };
  };

  const { dateStr: computedMinDateStr, noAvailable: noAppointmentSlots } = computeEarliestDate();

  const appointmentOpen = () => {
    if (!appointmentStart || !appointmentEnd) return false;
    const start = new Date(appointmentStart);
    const end = new Date(appointmentEnd);
    const now = new Date();
    return now >= start && now <= end;
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setError("");
    if (!val) {
      setDate("");
      setIsFriday(false);
      setTime("");
      return;
    }
    // Use a noon time to avoid timezone shift issues when parsing
    const sel = new Date(val + 'T12:00:00');
    const day = sel.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    if (day === 0 || day === 6) {
      setError('Selected date falls on a weekend (Saturday/Sunday). Please choose a weekday.');
      setDate("");
      setIsFriday(false);
      setTime("");
      return;
    }
    setDate(val);
    if (day === 5) {
      // Friday: force AM only
      setIsFriday(true);
      setTime('am');
    } else {
      setIsFriday(false);
      // If user selected today, prefill time to the next available slot on today (AM if still open, otherwise PM if still open)
      const sel = new Date(val + 'T12:00:00');
      const now = new Date();
      const noon = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate(), 12, 0, 0);
      const pmEnd = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate(), 16, 30, 0);
      if (sel.toDateString() === new Date().toDateString()) {
        if (now < noon) setTime('am');
        else if (now < pmEnd) setTime('pm');
        else {
          // Both slots passed for today; clear date and inform user
          setError('No slots remain today; please select the next available date.');
          setDate('');
          setIsFriday(false);
          return;
        }
      } else {
        // For future dates, clear time so user can choose, unless it's Friday where we've already handled
        setTime('');
      }
    }
  };

  // resolve the correct students/{docId} reference by trying:
  // 1) direct doc id, 2) idNumber field, 3) uid field, 4) fallback direct ref
  async function resolveStudentRef(db, studentId) {
    const directRef = doc(db, "students", studentId);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) return directRef;

    const qId = query(collection(db, "students"), where("idNumber", "==", studentId), limit(1));
    const snapById = await getDocs(qId);
    if (!snapById.empty) return snapById.docs[0].ref;

    const qUid = query(collection(db, "students"), where("uid", "==", studentId), limit(1));
    const snapByUid = await getDocs(qUid);
    if (!snapByUid.empty) return snapByUid.docs[0].ref;

    return directRef;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!date || !time) {
      setError("Please select a date and time.");
      return;
    }
    if (!studentId) {
      setError("Student ID missing. Please reload the page.");
      return;
    }
    // Validate date within appointment window if configured
    if (appointmentStart && appointmentEnd) {
      const sel = new Date(date + 'T12:00:00');
      const start = new Date(appointmentStart);
      const end = new Date(appointmentEnd);
      if (sel < start || sel > end) {
        setError("Selected date is outside the appointment booking window.");
        return;
      }
      const day = sel.getDay();
      // Disallow weekends
      if (day === 0 || day === 6) {
        setError('Selected date falls on a weekend (Saturday/Sunday). Please choose a weekday.');
        return;
      }
      // If Friday (5), ensure AM only
      if (day === 5 && time !== 'am') {
        setError('On Fridays, only AM schedule is allowed.');
        return;
      }
    }
    if (!appointmentOpen()) {
      setError("Appointment booking is currently closed.");
      return;
    }
    setSubmitting(true);
    try {
      const db = getFirestore();
      const studentRef = await resolveStudentRef(db, studentId);

      // use setDoc with merge so it updates existing doc or creates/merges if missing
      await setDoc(studentRef, {
        appointment: { date, time, status: "pending" }
      }, { merge: true });

      setSubmitting(false);
      // give real-time listener a moment to update parent state
      setTimeout(() => onClose(date, time), 300);
    } catch (err) {
      console.error("Failed to save appointment:", err);
      setSubmitting(false);
      setError(err?.message || "Failed to save appointment. Please try again.");
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.25)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 12, minWidth: 380, minHeight: 180, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.12)", position: "relative", fontSize: 15 }}>
        <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Book an Appointment</h3>
        <ul style={{ color: "#444", fontSize: 14, marginBottom: 16, paddingLeft: 18 }}>
          <li>Selected schedule before the opening date will be invalid.</li>
          <li>Please select a date between Mondays-Thursdays only, except holidays.</li>
          <li>For Friday, select AM schedule only.</li>
          <li>30 applicants per schedule only.</li>
        </ul>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 500 }}>Choose date Schedule</label><br />
          <input
            type="date"
            value={date}
            min={computedMinDateStr}
            max={appointmentEnd ? appointmentEnd.split('T')[0] : ''}
            onChange={handleDateChange}
            style={{ fontSize: 15, padding: 6, marginTop: 4, width: 180 }}
          />
          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            Note: Saturdays and Sundays are not allowed. On Fridays, only the AM slot is available.
          </div>
          {noAppointmentSlots && (
            <div style={{ color: 'red', marginTop: 8 }}>
              No appointment slots are available in the configured booking window.
            </div>
          )}
        </div>
        <div style={{ marginBottom: 18, display: "flex", gap: 24 }}>
          <label>
            <input
              type="radio"
              name="time"
              value="am"
              checked={time === "am"}
              onChange={() => setTime("am")}
              disabled={(() => {
                // Disable AM if the chosen date has AM expired or appointment window starts after AM end
                if (!date) return false;
                const sel = new Date(date + 'T12:00:00');
                const start = appointmentStart ? new Date(appointmentStart) : null;
                const now = new Date();
                // If selected day is today and current time is past noon, disable AM
                if (sel.toDateString() === new Date().toDateString()) {
                  const noon = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate(), 12, 0, 0);
                  if (now >= noon) return true;
                }
                // If appointment starts later than AM end on that date, disable AM
                if (start && start.toDateString() === sel.toDateString()) {
                  if (start.getHours() > 12 || (start.getHours() === 12 && start.getMinutes() > 0)) return true;
                }
                return false;
              })()}
            /> AM 9:00-12:00
          </label>
          <label>
            <input
              type="radio"
              name="time"
              value="pm"
              checked={time === "pm"}
              onChange={() => setTime("pm")}
              disabled={isFriday || (() => {
                if (!date) return false;
                const sel = new Date(date + 'T12:00:00');
                const start = appointmentStart ? new Date(appointmentStart) : null;
                const now = new Date();
                // If selected day is today and current time is past PM end, disable PM
                const pmEnd = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate(), 16, 30, 0);
                if (sel.toDateString() === new Date().toDateString() && now >= pmEnd) return true;
                // If appointment starts later than PM end on that date, disable PM
                if (start && start.toDateString() === sel.toDateString()) {
                  if (start.getHours() > 16 || (start.getHours() === 16 && start.getMinutes() > 30)) return true;
                }
                return false;
              })()}
            /> PM 1:30-4:30 {isFriday ? <span style={{ fontSize: 12, color: '#777' }}> (Not available on Fridays)</span> : null}
          </label>
        </div>
        {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, marginTop: 18 }}>
          <button type="button" onClick={() => onClose()} style={{ background: "#f5f5f5", color: "#e67e22", border: "none", borderRadius: 6, padding: "8px 22px", fontWeight: 500, fontSize: 15 }}>CLOSE</button>
          <button
            type="submit"
            disabled={submitting || noAppointmentSlots}
            style={{ background: (submitting || noAppointmentSlots) ? "#ccc" : "#27ae60", color: "#fff", border: "none", borderRadius: 6, padding: "8px 22px", fontWeight: 500, fontSize: 15 }}
            title={noAppointmentSlots ? "No appointment slots available in the configured window." : undefined}
          >{submitting ? "SUBMITTING..." : "SUBMIT"}</button>
        </div>
      </form>
    </div>
  );
}
