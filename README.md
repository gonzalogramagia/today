# 🗓️ Hoy & Today

**Your privacy-first, cloud-synced personal dashboard.**

"Hoy & Today" is a minimalist productivity hub designed to keep your focus sharp and your data persistent. It combines smart note-taking, daily task tracking, and quick navigation in a clean, high-performance interface.

---

## ✨ Key Features

### 📝 Smart Notes
- **Hybrid Storage**: Your notes are stored locally as a guest, or automatically synced to **Supabase Cloud** when logged in.
- **Auto-Preservation**: A fresh note is automatically generated whenever you clear your workspace.
- **Rich Formatting**: Markdown support (`*bold*`, `_italics_`) and automated link detection.
- **Emoji Support**: Native emoji integration via quick-insert shortcuts.
- **Universal Attachments**:
  - **Smart Grid**: Automatically manages layouts for up to 4 images.
  - **File Previews**: Interactive buttons for PDF and diverse document types in the note footer.
  - **Lightbox Preview**: High-quality fullscreen image viewer.
  - **Drag & Drop**: Seamlessly attach media by dropping files onto your workspace.

### ✅ Focus-Driven Tasks
- **Focus Mode**: Active task creation fades out distractions to keep you in the zone.
- **Auto Reset**: Progress is automatically reset at midnight (Argentina Time 🇦🇷).
- **Safe Management**: Multi-step confirmation for deletions to prevent data loss.

### ☁️ Authentication & Cloud Sync
- **Google Auth**: Secure, single-click login.
- **Cross-Device Persistence**: Your shortcuts and notes follow you anywhere.
- **Auth Pills**: Premium user profile UI with responsive logout states.

### 🧭 Navigation & Shortcuts
- **Shortcut Hub**: Dynamic, user-configurable shortcuts with auto-loading favicons.
- **Animated Loaders**: Smooth pulse-loading states for remote data fetching.
- **Floating Links**: Quick access to Emojis, Playlists, and Minigames.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) |
| **State & Flow** | [React 19](https://react.dev/) |
| **Backend / Sync** | [Supabase](https://supabase.com/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Database/Auth** | Cloud Sync via @supabase/ssr |
| **Type Safety** | [TypeScript](https://www.typescriptlang.org/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Web Typography** | [Geist Sans/Mono](https://vercel.com/font) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22+
- Yarn

### Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/gonzalogramagia/today.git
   cd today
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Environment Configuration**
   Create a `.env.local` file with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Run development server**
   ```bash
   yarn dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## 📦 Extensions (Recommended)
Enhance your flow with these productivity tools:
- **[New Tab Redirect](https://chromewebstore.google.com/detail/new-tab-redirect/icpgjfneehieebagbmdbhnlpiopdcmna)**: Set _Hoy & Today_ as your default dashboard.
- **[Just Focus](https://chromewebstore.google.com/detail/just-focus/gefaddaengbodpiobpbgblajdboalmgc)**: Eliminate distractions during deep work sessions.
- **[Malwarebytes Browser Guard](https://chromewebstore.google.com/detail/malwarebytes-browser-guar/ihcjicgdanjaechkgeegckofjjedodee)**: Privacy focused ad & tracker blocking.

---

Made with 💛 by [Gonza](https://github.com/gonzalogramagia)
