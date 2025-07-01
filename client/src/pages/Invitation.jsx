import { useState } from "react";
import { useUserData } from "../context/userDataContext";
import axios from "axios";
import { Users, Mail, Send, Gift, Sparkles, ArrowRight } from 'lucide-react';

const ParticlesBG = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-full blur-xl animate-pulse"></div>
    <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-xl animate-pulse delay-1000"></div>
    <div className="absolute bottom-40 left-20 w-40 h-40 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-xl animate-pulse delay-2000"></div>
    <div className="absolute bottom-20 right-10 w-28 h-28 bg-gradient-to-r from-yellow-400/10 to-amber-400/10 rounded-full blur-xl animate-pulse delay-3000"></div>
  </div>
);

export const Invite = () => {
  const { user } = useUserData();
  const [senderName, setSenderName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const serviceId = import.meta.env.VITE_SERVICE_ID;
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
    };

    try {
      const res = await axios.post('https://api.emailjs.com/api/v1.0/email/send', data);
      if (res.status !== 200) {
        throw new Error("Failed to send invitation");
      }
      setStatus("Invitation sent successfully!");
      setSenderName("");
      setRecipientEmail("");
    } catch (error) {
      setStatus("Failed to send invitation. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
      <ParticlesBG />
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-emerald-900/20"></div>
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="max-w-2xl w-full">
          {/* Header Section */}
          <div className="text-center mb-8 mt-20">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-green-100 to-green-200 bg-clip-text text-transparent mb-4">
              Invite Friends to BinGo
            </h1>
          </div>
          {/* Benefits Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Gift, title: "Earn Rewards", desc: "Get 100 points for each friend", color: "from-yellow-400 to-amber-400" },
              { icon: Users, title: "Build Community", desc: "Create your eco-warrior squad", color: "from-blue-400 to-cyan-400" },
              { icon: Sparkles, title: "Double Impact", desc: "Multiply your environmental impact", color: "from-green-400 to-emerald-400" }
            ].map((benefit, i) => (
              <div key={i} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105">
                <div className={`w-10 h-10 bg-gradient-to-r ${benefit.color} rounded-xl flex items-center justify-center mb-3`}>
                  <benefit.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-white mb-1">{benefit.title}</h3>
                <p className="text-sm text-gray-300">{benefit.desc}</p>
              </div>
            ))}
          </div>
          {/* Main Form Card */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div className="absolute top-8 right-8 w-1 h-1 bg-white/60 rounded-full animate-pulse delay-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Send Invitation</h2>
                  <p className="text-gray-300">Fill in the details to invite your friend</p>
                </div>
              </div>
              <form onSubmit={handleInvite} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-green-300 font-semibold mb-2 text-sm uppercase tracking-wide">
                      Your Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={senderName}
                        onChange={e => setSenderName(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                        placeholder="Enter your name"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400/20 to-emerald-400/20 opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-green-300 font-semibold mb-2 text-sm uppercase tracking-wide">
                      Friend's Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                        placeholder="Enter your friend's email"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400/20 to-emerald-400/20 opacity-0 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 hover:from-green-300 hover:via-emerald-300 hover:to-green-400 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Sending Invitation...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                        <span>Send Invitation</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </div>
                </button>
              </form>
              {status && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-green-300 font-semibold">{status}</p>
                      <p className="text-green-200/80 text-sm">Your friend will receive the invitation shortly!</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Footer note */}
          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              By inviting friends, you're helping build a cleaner, greener community. 🌱
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invite;