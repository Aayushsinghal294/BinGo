import { useState } from "react";
import { useUserData } from "../context/userDataContext";
import axios from "axios";

export const Invite = () => {

  const {user} = useUserData();
  const [senderName, setSenderName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();

    const serviceId = import .meta.env.VITE_SERVICE_ID;
    const templateId = import.meta.env.VITE_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_PUBLIC_KEY;

    const data = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
        'name': senderName,
        'recipient_email': recipientEmail,
        'sender_email': user?.email,
    }
    }

    try {
        const res = await axios.post('https://api.emailjs.com/api/v1.0/email/send', data)
        console.log(res.data)
        if(res.status !== 200) {
            throw new Error("Failed to send invitation");
        }
        setStatus("Invitation sent successfully!");
        setSenderName("");
        setRecipientEmail("");
        setLoading(false);
    } catch (error) {
        console.error("Error sending invitation:", error);
        setStatus("Failed to send invitation. Please try again.");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-900 via-black to-emerald-900">
      <div className="bg-gradient-to-br from-green-800 via-green-900 to-emerald-900 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-green-700/40">
        <h1 className="text-3xl font-extrabold text-green-200 mb-4 flex items-center gap-2">
          Invite Friends
        </h1>
        <p className="mb-6 text-green-100">
          Share the joy of eco-action! Invite your friends to join BinGo and earn rewards together.
        </p>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-green-300 font-semibold mb-1">Your Name</label>
            <input
              type="text"
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-green-300/30 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-green-300 font-semibold mb-1">Friend's Email</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-white/20 border border-green-300/30 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Enter your friend's email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-xl font-bold shadow-lg hover:from-green-400 hover:to-emerald-400 transition"
          >
            {loading ? "Sending..." : "Send Invitation"}
          </button>
        </form>
        {status && (
          <div className="mt-4 text-green-300 font-semibold text-center">{status}</div>
        )}
      </div>
    </div>
  )}