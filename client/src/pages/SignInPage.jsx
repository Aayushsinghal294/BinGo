import React, { useRef, useEffect } from 'react';
import { SignIn } from "@clerk/clerk-react";
import { motion } from 'framer-motion';
import { Sparkles, Leaf, Recycle, Trophy } from 'lucide-react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Floating particles with eco theme
    const particles = Array.from({ length: 20 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 4 + Math.random() * 8,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      color: ['#10b981', '#34d399', '#6ee7b7', '#22c55e', '#16a34a'][Math.floor(Math.random() * 5)],
      opacity: 0.3 + Math.random() * 0.4,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Floating geometric shapes
    const shapes = Array.from({ length: 8 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 20 + Math.random() * 40,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      type: ['circle', 'triangle', 'square'][Math.floor(Math.random() * 3)],
      color: ['#10b981', '#059669', '#047857', '#065f46'][Math.floor(Math.random() * 4)],
      opacity: 0.1 + Math.random() * 0.2,
    }));

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Draw particles
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.02;

        // Wrap around screen
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const dynamicOpacity = p.opacity + Math.sin(p.pulse) * 0.2;
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, dynamicOpacity);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + Math.sin(p.pulse) * 2, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      // Draw floating shapes
      shapes.forEach(s => {
        s.x += s.speedX;
        s.y += s.speedY;
        s.rotation += s.rotationSpeed;

        // Wrap around screen
        if (s.x < -50) s.x = width + 50;
        if (s.x > width + 50) s.x = -50;
        if (s.y < -50) s.y = height + 50;
        if (s.y > height + 50) s.y = -50;

        ctx.save();
        ctx.globalAlpha = s.opacity;
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.fillStyle = s.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = s.color;

        switch (s.type) {
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, s.size / 2, 0, 2 * Math.PI);
            ctx.fill();
            break;
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -s.size / 2);
            ctx.lineTo(-s.size / 2, s.size / 2);
            ctx.lineTo(s.size / 2, s.size / 2);
            ctx.closePath();
            ctx.fill();
            break;
          case 'square':
            ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
            break;
        }
        ctx.restore();
      });

      requestAnimationFrame(animate);
    }

    animate();

    function handleResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ 
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #0f172a 70%, #065f46 100%)" 
      }}
    />
  );
};

const FloatingIcons = () => {
  const icons = [
    { Icon: Leaf, delay: 0, position: 'top-20 left-10' },
    { Icon: Recycle, delay: 2, position: 'top-40 right-20' },
    { Icon: Trophy, delay: 4, position: 'bottom-40 left-20' },
    { Icon: Sparkles, delay: 6, position: 'bottom-20 right-10' },
  ];

  return (
    <>
      {icons.map(({ Icon, delay, position }, i) => (
        <motion.div
          key={i}
          className={`absolute ${position} z-[1]`}
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 0.3, scale: 1, rotate: 0 }}
          transition={{ 
            delay: delay, 
            duration: 2, 
            type: "spring", 
            stiffness: 100 
          }}
        >
          <motion.div
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          >
            <Icon className="w-12 h-12 text-emerald-400/30" />
          </motion.div>
        </motion.div>
      ))}
    </>
  );
};

// Clerk appearance config with GitHub button override for visibility
const signInAppearance = {
  variables: {
    colorPrimary: "#10b981",
    colorText: "#f0fdf4",
    colorBackground: "rgba(15, 23, 42, 0.95)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "20px",
    colorInputBackground: "rgba(16, 185, 129, 0.1)",
    colorInputText: "#f0fdf4",
    colorInputBorder: "rgba(16, 185, 129, 0.3)",
    colorAlphaShade: "rgba(16, 185, 129, 0.15)",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    colorNeutral: "#64748b",
    colorShimmer: "rgba(16, 185, 129, 0.2)",
    colorTextOnPrimaryBackground: "#0f172a",
    colorTextSecondary: "#94a3b8",
  },
  elements: {
    card: "shadow-2xl border border-emerald-400/30 bg-slate-900/80 backdrop-blur-2xl rounded-3xl overflow-hidden relative flex flex-col items-center justify-center",
    headerTitle: "text-white font-bold text-3xl bg-gradient-to-r from-emerald-300 via-green-300 to-emerald-400 bg-clip-text text-transparent mb-2",
    headerSubtitle: "text-emerald-200/80 text-lg font-medium",
    formButtonPrimary: `
      bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 
      hover:from-emerald-400 hover:via-green-400 hover:to-emerald-500 
      text-slate-900 rounded-2xl font-bold shadow-2xl 
      transition-all duration-500 transform hover:scale-105 hover:shadow-emerald-500/25
      border border-emerald-400/50 relative overflow-hidden
      before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent 
      before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700
    `,
    formFieldInput: `
      rounded-2xl border-emerald-400/40 focus:border-emerald-400 focus:ring-emerald-400/30 
      bg-slate-800/60 backdrop-blur-xl text-emerald-50 placeholder:text-emerald-200/50
      transition-all duration-300 shadow-lg focus:shadow-emerald-500/20
      hover:bg-slate-800/80 focus:bg-slate-800/90
    `,
    formFieldLabel: "text-emerald-200 font-semibold text-sm mb-2",
    socialButtonsBlockButton: `
      bg-gradient-to-r from-slate-800/80 to-slate-700/80 text-emerald-100 
      rounded-2xl border border-emerald-400/30 hover:border-emerald-400/60
      backdrop-blur-xl transition-all duration-300 font-semibold
      hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-[1.02]
      flex items-center justify-center
    `,
    socialButtonsBlockButtonText: "text-emerald-100 font-medium",
    dividerLine: "bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent h-px",
    dividerText: "text-emerald-200/70 font-medium bg-slate-900/90 px-4",
    footerAction: "text-emerald-300 font-medium hover:text-emerald-200 transition-colors",
    footerActionLink: "text-emerald-400 hover:text-emerald-300 font-semibold underline decoration-emerald-400/50 hover:decoration-emerald-300",
    formFieldInputShowPasswordButton: "text-emerald-300 hover:text-emerald-200 transition-colors",
    formFieldInputIcon: "text-emerald-400",
    identityPreview: "bg-slate-800/60 border-emerald-400/40 text-emerald-100 rounded-2xl backdrop-blur-xl",
    formResendCodeLink: "text-emerald-400 hover:text-emerald-300 font-semibold transition-colors",
    formFieldErrorText: "text-red-400 font-medium bg-red-900/20 px-3 py-1 rounded-lg backdrop-blur-sm",
    formFieldSuccessText: "text-green-400 font-medium bg-green-900/20 px-3 py-1 rounded-lg backdrop-blur-sm",
    logoBox: "mx-auto mb-6",
    main: "p-8 flex flex-col items-center justify-center",
    footer: "p-6 bg-slate-900/40 backdrop-blur-xl border-t border-emerald-400/20",
  }
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <AnimatedBackground />
      <FloatingIcons />
      
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main content */}
      <motion.div 
        className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 1, 
          type: "spring", 
          stiffness: 100,
          damping: 20
        }}
      >
        {/* Header with brand */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <motion.div
            className="relative inline-block"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h1 className="text-4xl my-20 font-bold bg-gradient-to-r from-emerald-300 via-green-300 to-emerald-400 bg-clip-text text-transparent mb-2">
              BinGo
              <motion.span
                className="absolute -top-1 -right-6"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </motion.span>
            </h1>
          </motion.div>
          <p className="text-emerald-100/80 text-lg font-medium">
            Welcome back to your eco-journey
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full mx-auto mt-3"></div>
        </motion.div>

        {/* Sign-in form with enhanced styling */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative flex flex-col items-center justify-center"
        >
          {/* Glow effect behind the form */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-60"></div>
          
          <div className="relative flex flex-col items-center justify-center">
            <SignIn 
              appearance={signInAppearance}
              afterSignInUrl="/dashboard"
              redirectUrl="/dashboard"
            />
          </div>
        </motion.div>

        {/* Additional decorative elements */}
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-6 text-emerald-200/60 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span>Secure Login</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-500"></div>
              <span>Eco Rewards</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse delay-1000"></div>
              <span>Join 5k+ Users</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-20 h-20 border-t-2 border-l-2 border-emerald-400/30 rounded-tl-3xl z-[1]"></div>
      <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-emerald-400/30 rounded-tr-3xl z-[1]"></div>
      <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/30 rounded-bl-3xl z-[1]"></div>
      <div className="absolute bottom-4 right-4 w-20 h-20 border-b-2 border-r-2 border-emerald-400/30 rounded-br-3xl z-[1]"></div>
    </div>
  );
}