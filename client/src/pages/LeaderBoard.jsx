import { useEffect, useState } from 'react';
import { Crown, Star } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

export default function Leaderboard() {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(({ users }) => setUsers(users))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-emerald-300 text-center pt-32">Loading leaderboard…</p>;
  }

  const maxPoints = Math.max(...users.map(u => u.totalPoints), 1);

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fillBar {
          from { width: 0; }
          to { width: var(--fill); }
        }
        @keyframes avatarFadeIn {
          from { opacity: 0; transform: scale(0.8);}
          to { opacity: 1; transform: scale(1);}
        }
        @keyframes glow {
          from { box-shadow: 0 0 8px 2px rgba(52,211,153,0.7), 0 0 0 0 transparent; }
          to { box-shadow: 0 0 18px 6px rgba(52,211,153,0.9), 0 0 8px 2px #fff3; }
        }
        .animate-slideIn {
          animation: slideIn 0.7s cubic-bezier(.22,1,.36,1) forwards;
        }
        .animate-fillBar {
          animation: fillBar 1.2s cubic-bezier(.22,1,.36,1) forwards;
        }
        .avatar-fadeIn {
          animation: avatarFadeIn 0.7s cubic-bezier(.22,1,.36,1) forwards;
        }
        .avatar-current {
          animation: glow 2.5s infinite alternate;
        }
        .card {
          transition: transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s, background 0.3s;
          box-shadow: 0 2px 10px 0 rgba(16, 185, 129, 0.08), 0 1.5px 8px 0 rgba(0,0,0,0.14);
          background: linear-gradient(90deg, rgba(16,185,129,0.09) 0%, rgba(30,41,59,0.7) 100%);
          border-radius: 18px;
        }
        .card:hover {
          transform: translateY(-6px) scale(1.025) rotateZ(-0.5deg);
          box-shadow: 0 10px 32px 0 rgba(16, 185, 129, 0.18), 0 4px 18px 0 rgba(0,0,0,0.22);
          background: linear-gradient(90deg, rgba(52,211,153,0.18) 0%, rgba(30,41,59,0.82) 100%);
        }
        .bar {
          transition: background 0.3s;
          background: linear-gradient(90deg, #34d399 0%, #059669 100%);
        }
        .card:hover .bar {
          background: linear-gradient(90deg, #6ee7b7 0%, #34d399 100%);
        }
        .crown-glow {
          filter: drop-shadow(0 0 6px #facc15cc);
          animation: crownGlow 1.2s infinite alternate;
        }
        @keyframes crownGlow {
          from { filter: drop-shadow(0 0 6px #facc15cc);}
          to { filter: drop-shadow(0 0 16px #fde68a);}
        }
        .level-badge {
          background: linear-gradient(90deg, #059669 0%, #34d399 100%);
          color: #fff;
          font-weight: bold;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.95em;
          letter-spacing: 0.02em;
          box-shadow: 0 1px 4px #05966933;
          margin-top: 2px;
          display: inline-block;
        }
        /* Responsive styles */
        @media (max-width: 900px) {
          .card {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 1rem;
          }
          .card > .w-8 {
            margin-bottom: 0.5rem;
          }
          .card > img {
            margin-bottom: 0.5rem;
          }
          .card > .flex-1 {
            margin-bottom: 0.5rem;
          }
          .card > .flex-shrink-0 {
            width: 100%;
            margin: 0.5rem 0;
          }
        }
        @media (max-width: 600px) {
          .card {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            padding: 0.75rem;
          }
          .card > .w-8 {
            font-size: 1rem;
          }
          .card > img {
            width: 2.5rem !important;
            height: 2.5rem !important;
          }
          .card > .flex-shrink-0 {
            width: 100%;
            margin: 0.25rem 0;
          }
          .level-badge {
            font-size: 0.85em;
            padding: 2px 8px;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-900 to-slate-900 pt-32 pb-16 px-2 sm:px-4">
        <div className="max-w-3xl mx-auto bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-8 shadow-2xl">
          <h1 className="text-2xl sm:text-4xl font-bold text-center text-emerald-200 mb-6 sm:mb-8 tracking-tight drop-shadow-lg">
            🌿 BinGo Leaderboard
          </h1>
          <div className="space-y-4 sm:space-y-5">
            {users.map((u, i) => {
              const isCurrent = u.clerkId === user?.id;
              const percent = `${Math.floor((u.totalPoints / maxPoints) * 100)}%`;

              return (
                <div
                  key={u.clerkId}
                  className={`
                    card flex items-center gap-4 p-4 rounded-lg relative
                    ${isCurrent ? 'bg-emerald-700/60 border-2 border-emerald-400 avatar-current' : 'bg-slate-700/60'}
                    backdrop-blur-md animate-slideIn
                  `}
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <div className="w-8 text-lg font-bold text-emerald-300 text-center drop-shadow">
                    #{i+1}
                  </div>
                  {i < 3 && (
                    <span className="absolute -left-3 -top-3 z-10">
                      <Crown
                        className={`w-6 h-6
                          ${i===0 ? 'text-yellow-300 crown-glow' :
                            i===1 ? 'text-gray-300 crown-glow' :
                            'text-orange-300 crown-glow'
                          }`}
                      />
                    </span>
                  )}
                  <img
                    src={u.profileImage || '/default-avatar.png'}
                    alt=""
                    className={`
                      w-12 h-12 rounded-full border-2 border-emerald-500 flex-shrink-0 shadow-lg
                      avatar-fadeIn ${isCurrent ? 'avatar-current' : ''}
                    `}
                    style={{ animationDelay: `${i * 120 + 100}ms` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">
                      {u.name}
                    </div>
                    <span className="level-badge">
                      Level {u.level}
                    </span>
                  </div>
                  <div className="flex-shrink-0 w-44 h-3 bg-emerald-800/80 rounded overflow-hidden shadow-inner mx-2">
                    <div
                      className="bar h-full rounded animate-fillBar"
                      style={{ '--fill': percent }}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-green-200 font-bold text-lg">
                    <Star className="w-5 h-5 animate-pulse text-green-300" />
                    <span className="drop-shadow">{u.totalPoints}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

