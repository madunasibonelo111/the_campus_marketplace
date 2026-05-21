import React, { useState } from "react";
import { supabase } from "@/supabase/supabaseClient";

export default function ProfileSettingsModal({ isOpen, onClose, currentUserData, onSaveSuccess }) {
  // Profile State
  const [name, setName] = useState(currentUserData?.name || "");
  const [bio, setBio] = useState(currentUserData?.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  
  // Security State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // --- 1. HANDLE PASSWORD CHANGE (If requested) ---
      if (newPassword !== "") {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match!");
        }
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) throw passwordError;
      }

      // --- 2. HANDLE AVATAR UPLOAD ---
      let finalAvatarUrl = currentUserData?.avatar_url;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${currentUserData.id}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrl;
      }

      // --- 3. UPDATE PUBLIC PROFILE DATA ---
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: name,
          bio: bio,
          avatar_url: finalAvatarUrl
        })
        .eq('id', currentUserData.id);

      if (updateError) throw updateError;

      alert("Settings updated successfully!");
      onSaveSuccess(); 
      onClose(); 

    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginTop: 0, color: '#0b1f3a' }}>Account Settings</h2>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* PUBLIC INFO SECTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Profile Picture</label>
            <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '8px' }}/>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Display Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}/>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>About Me (Bio)</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows="2" placeholder="Tell buyers/sellers about yourself..." style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}/>
          </div>

          {/* SECURITY SECTION */}
          <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "10px 0" }} />
          <h4 style={{ margin: 0, color: '#0b1f3a' }}>Security</h4>
          <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Leave blank if you do not want to change your password.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}/>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '14px' }}>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}/>
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? "Saving..." : "Save Changes"}</button>
          </div>

        </form>
      </div>
    </div>
  );
}