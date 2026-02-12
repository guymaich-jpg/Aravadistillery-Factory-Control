#!/bin/bash

# GitHub Deployment Script for Factory Control App
# This script will initialize git, create a repository, and push to GitHub

echo "🚀 Factory Control - GitHub Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    echo "   Visit: https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git found"
echo ""

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already initialized"
fi

echo ""

# Add all files
echo "📝 Adding files to Git..."
git add .
echo "✅ Files added"

echo ""

# Commit
echo "💾 Creating commit..."
git commit -m "Initial commit: Factory Control App - Hebrew/English bilingual production system" || echo "⚠️  No changes to commit"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Next Steps:"
echo ""
echo "1. Create a new repository on GitHub:"
echo "   👉 Go to: https://github.com/new"
echo "   Repository name: factory-control"
echo "   Description: Alcohol Production Documentation - Bilingual (EN/HE)"
echo "   Make it PUBLIC (required for free GitHub Pages)"
echo ""
echo "2. Connect to your GitHub repository:"
echo "   Run these commands (replace guymaich-jpg with your username):"
echo ""
echo "   git remote add origin https://github.com/guymaich-jpg/factory-control.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Enable GitHub Pages:"
echo "   • Go to repository Settings → Pages"
echo "   • Source: Deploy from branch 'main', folder '/ (root)'"
echo "   • Click Save"
echo ""
echo "4. Your app will be live at:"
echo "   https://guymaich-jpg.github.io/factory-control/"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tip: After pushing, wait 1-2 minutes for GitHub Pages to build"
echo ""
