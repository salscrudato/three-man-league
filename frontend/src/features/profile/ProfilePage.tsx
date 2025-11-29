/**
 * Profile Page - Update user display name and view account info
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Card } from "../../components";
import { LuArrowLeft, LuUser, LuMail, LuCheck, LuLoader } from "react-icons/lu";

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: displayName.trim() });
      
      // Sync to Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        email: user.email || "",
        photoURL: user.photoURL || "",
        lastUpdated: new Date(),
      }, { merge: true });

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      console.error("Failed to update profile:", err);
      setMessage({ type: "error", text: "Failed to update profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-xs mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-tiny text-text-secondary hover:text-text-primary mb-2">
          <LuArrowLeft className="w-3 h-3" /> Back
        </button>
        <h1 className="text-section-title text-text-primary">Profile</h1>
      </div>

      {message && (
        <div className={`mb-3 p-2 rounded-md text-tiny ${message.type === "success" ? "bg-success/10 border border-success/20 text-success" : "bg-error-soft border border-error/20 text-error"}`}>
          {message.text}
        </div>
      )}

      <Card padding="sm">
        <form onSubmit={handleSave} className="space-y-2.5">
          <div>
            <label className="flex items-center gap-1 text-tiny font-medium text-text-primary mb-1">
              <LuUser className="w-3 h-3" /> Display Name
            </label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name"
              className="w-full px-2.5 py-1.5 bg-white border border-border/40 rounded-md text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary" required />
          </div>
          <div>
            <label className="flex items-center gap-1 text-tiny font-medium text-text-primary mb-1">
              <LuMail className="w-3 h-3" /> Email
            </label>
            <input type="email" value={user.email || ""} disabled className="w-full px-2.5 py-1.5 bg-subtle/60 border border-border/30 rounded-md text-body-sm text-text-muted cursor-not-allowed" />
            <p className="mt-0.5 text-tiny text-text-muted">Cannot be changed</p>
          </div>
          <button type="submit" disabled={saving || !displayName.trim() || displayName === user.displayName}
            className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-white rounded-md text-body-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
            {saving ? <LuLoader className="w-3.5 h-3.5 animate-spin" /> : <><LuCheck className="w-3.5 h-3.5" />Save</>}
          </button>
        </form>
      </Card>
    </div>
  );
};

