# OpenAnalyst Accountability Coach - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/openanalyst-accountability-coach.git

# Navigate to UI directory
cd openanalyst-accountability-coach/ui

# Install dependencies
npm install
```

### 2. Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Complete First-Time Onboarding

The app will automatically guide you through:
- ✅ Choosing your accountability style (Strict/Balanced/Friendly)
- ✅ Setting your New Year resolution (optional)
- ✅ Creating your first challenge (mandatory)

**That's it!** Everything else happens in the UI.

---

## 📚 What You Can Do

### Create Agents
- Click **+ Add Agent** in the sidebar
- Choose from 3 methods:
  1. Browse marketplace
  2. Create manually
  3. **Use AI to create** (Recommended)

### Manage Skills
- Go to **Skills** in the sidebar
- Browse 14 available skills
- Add/remove skills from agents
- Create custom skills using **skill-writer**

### Set Up Challenges
- Click **Create New Challenge** or say it in chat
- Answer conversational questions
- Set punishment contracts
- Track progress with streaks

### Use the UI
- **Sidebar**: Navigate between agents, skills, schedule, etc.
- **Chat**: Conversational interface with agents
- **Right Panel**: Manage agent skills and quick actions
- **Gumroad-style animations**: Smooth, tactile button interactions

---

## 🎨 UI Features

### Animated Buttons
All buttons use the new **AnimatedButton** component with:
- Spring animations on hover/click
- Push-down effect when clicked
- Smooth transitions

### Sidebar Navigation
- Active state highlighting
- Smooth hover animations
- Icon wiggle on selection
- Badge counts for todos/notifications

### Dark Theme
- Clean, modern design
- Subtle shadows and borders
- Accent color highlights

---

## 🛠️ No CLI Installation Required

Everything works out of the box:
- ✅ Skills auto-discovered from `skills/` directory
- ✅ Agents created via UI
- ✅ Challenges tracked in `~/.openanalyst/`
- ✅ All features functional immediately

---

## 📖 Full Documentation

For detailed guides, see [USER_MANUAL.md](./USER_MANUAL.md):
- Creating custom agents
- Creating custom skills
- Setting up challenges
- Understanding the UI
- Advanced features

---

## 🎯 Key Concepts

**Agents**: AI coaches for specific domains (Fitness, Career, Study, etc.)

**Skills**: Modular capabilities that agents can use (14 included)

**Challenges**: Goal-tracking systems with streaks and punishment contracts

**Onboarding**: Conversational setup flow (one question at a time with clickable options)

---

## 🔥 Pro Tips

1. **Start with one agent**: The default Accountability Coach is perfect to begin
2. **Use skill-writer**: Easiest way to create custom skills
3. **Set realistic goals**: Small wins build momentum
4. **Enable punishments**: Real stakes = real results
5. **Check in daily**: Consistency is everything

---

## 🏗️ Project Structure

```
openanalyst-accountability-coach/
├── skills/                    # 14 pre-built skills
│   ├── streak/
│   ├── nutritional-specialist/
│   ├── skill-writer/          # Use this to create more!
│   └── ...
├── ui/                        # Next.js app
│   ├── app/                   # Routes and pages
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   │   └── AnimatedButton.tsx  # 👈 Use this everywhere!
│   │   └── sidebar/          # Navigation components
│   ├── lib/                   # Utilities
│   └── types/                 # TypeScript types
├── USER_MANUAL.md             # Detailed documentation
└── QUICK_START.md            # This file
```

---

## 🎬 Next Steps

1. ✅ Start the app: `npm run dev`
2. ✅ Complete onboarding (create first challenge)
3. ✅ Explore the Skills marketplace
4. ✅ Create a custom agent for your domain
5. ✅ Build your first custom skill
6. ✅ Set up multiple challenges
7. ✅ Track your progress daily

---

## 💡 Need Help?

- Read the [USER_MANUAL.md](./USER_MANUAL.md)
- Check GitHub Issues
- Join the Discord community
- Email: support@openanalyst.com

---

**Made with ❤️ by the OpenAnalyst community**

Start your accountability journey today! 🚀
