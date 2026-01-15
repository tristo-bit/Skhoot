# Dynamous Kiro Hackathon Quickstart Template

🚀 **Your starting point for the Dynamous and Kiro Hackathon** - A comprehensive template with pre-configured Kiro CLI setup, development workflows, and submission guidelines.

> **📖 New to Kiro?** Check out [kiro-guide.md](kiro-guide.md) to quickly get accustomed to how Kiro works and understand its unique features for the hackathon.

## About the Hackathon

The **Kiro Hackathon** is a coding competition where developers build real-world applications using the Kiro CLI. Show off your AI-powered development skills and compete for **$17,000 in prizes**.

- **📅 Dates**: January 5-23, 2026
- **💰 Prize Pool**: $17,000 across 10 winners
- **🎯 Theme**: Open - build anything that solves a real problem
- **🔗 More Info**: [dynamous.ai/kiro-hackathon](https://dynamous.ai/kiro-hackathon)

## What's Included

This template provides everything you need to get started:

- **📋 Steering Documents**: Pre-configured project templates (product.md, tech.md, structure.md)
- **⚡ Custom Prompts**: 11 powerful development workflow prompts
- **📖 Examples**: Sample README and DEVLOG showing best practices
- **🏆 Hackathon Tools**: Specialized code review prompt for submission evaluation

## Quick Start

### 1. Clone This Template
```bash
git clone https://github.com/coleam00/dynamous-kiro-hackathon
cd dynamous-kiro-hackathon
```

### 2. Run the Setup Wizard
```bash
@quickstart
```

This assumes you already have Kiro CLI installed and that you started with the `kiro-cli` command in your terminal.

This interactive wizard will:
- ✅ Fill out your steering documents with project details
- ✅ Configure your development workflow
- ✅ Set up Kiro CLI for your specific project
- ✅ Explain all available prompts and features

### 3. Start Building
Your project is now configured! Use these core prompts:
- **`@prime`** - Load project context
- **`@plan-feature`** - Plan new features
- **`@execute`** - Implement plans systematically
- **`@code-review`** - Review code quality

**Note:** Your typical workflow will be `@prime` → `@plan-feature` → `@execute` → `@code-review`, but feel free to change it however you want. These commands may require additional details (like what feature to plan or which plan file to execute), but Kiro will ask for these parameters after you invoke the command.

## Development Workflow (Customize this However You Want!)

### Initial Setup (One-Time)
1. **Complete setup**: Run `@quickstart` to configure your project

### Core Development Cycle (Every Feature/Session)

### Phase 1: Setup & Planning
1. **Load context**: Use `@prime` to understand your codebase
2. **Plan features**: Use `@plan-feature` for comprehensive planning

### Phase 2: Build & Iterate
1. **Implement**: Use `@execute` to build features systematically
2. **Review**: Use `@code-review` to maintain code quality
3. **Document**: Update your DEVLOG.md as you work
4. **Optimize**: Customize your `.kiro/` configuration for your workflow

### Phase 3: Submission Preparation
1. **Final review**: Run `@code-review-hackathon` for submission evaluation
2. **Polish documentation**: Ensure README.md and DEVLOG.md are complete
3. **Verify requirements**: Check all submission criteria are met

## Submission Requirements

Your submission will be judged on these criteria (100 points total):

### Application Quality (40 points)
- **Functionality & Completeness** (15 pts): Does it work as intended?
- **Real-World Value** (15 pts): Does it solve a genuine problem?
- **Code Quality** (10 pts): Is the code well-structured and maintainable?

### Kiro CLI Usage (20 points)
- **Effective Use of Features** (10 pts): How well did you leverage Kiro CLI?
- **Custom Commands Quality** (7 pts): Quality of your custom prompts
- **Workflow Innovation** (3 pts): Creative use of Kiro CLI features

### Documentation (20 points)
- **Completeness** (9 pts): All required documentation present
- **Clarity** (7 pts): Easy to understand and follow
- **Process Transparency** (4 pts): Clear development process documentation

### Innovation (15 points)
- **Uniqueness** (8 pts): Original approach or solution
- **Creative Problem-Solving** (7 pts): Novel technical solutions

### Presentation (5 points)
- **Demo Video** (3 pts): Clear demonstration of your project
- **README** (2 pts): Professional project overview

## Required Documentation

Ensure these files are complete and high-quality:

### README.md
- Clear project description and value proposition
- Prerequisites and setup instructions
- Architecture overview and key components
- Usage examples and troubleshooting

*There's a lot of freedom for how you can structure this. Just make sure that it's easy for someone viewing this to know exactly what your project is about and how to run it themselves. This is the main criteria that explains the project clearly and how to test it in a local environment.*

### DEVLOG.md
- Development timeline with key milestones
- Technical decisions and rationale
- Challenges faced and solutions implemented
- Time tracking and Kiro CLI usage statistics

*There's a lot of freedom in how you structure this too. It's up to you how you want to document your timeline, milestones, decisions made, challenges you encounter, and all those kinds of things. Feel free to use Kiro to help you maintain your devlog as you're working on the project. Hint: create a Kiro prompt to help you update your log based on what's happening.*

### .kiro/ Directory
- **Steering documents**: Customized for your project
- **Custom prompts**: Workflow-specific commands
- **Configuration**: Optimized for your development process

*This template provides a good starting point with prompts, and the wizard helps you set up your initial steering documents. However, it's encouraged for you to continue to customize things and refine it as you're working on your project.*

## Available Prompts

This template includes 11 powerful development prompts:

### Core Development
- **`@prime`** - Load comprehensive project context
- **`@plan-feature`** - Create detailed implementation plans
- **`@execute`** - Execute plans with systematic task management
- **`@quickstart`** - Interactive project setup wizard

### Quality Assurance
- **`@code-review`** - Technical code review for quality and bugs
- **`@code-review-hackathon`** - Hackathon submission evaluation
- **`@code-review-fix`** - Fix issues found in code reviews
- **`@system-review`** - Analyze implementation vs plan

### Documentation & Planning
- **`@create-prd`** - Generate Product Requirements Documents
- **`@execution-report`** - Generate implementation reports
- **`@rca`** - Root cause analysis for issues
- **`@implement-fix`** - Implement fixes based on analysis

## Examples

Check the `examples/` folder for:
- **README.md**: Professional project documentation example
- **DEVLOG.md**: Comprehensive development log example

These examples show the level of detail and professionalism expected for hackathon submissions.

## Tips for Success

### Maximize Your Score
1. **Use Kiro CLI extensively** - It's 20% of your score
2. **Document everything** - Process documentation is 20% of your score
3. **Build something useful** - Real-world value is heavily weighted
4. **Optimize your workflow** - Custom prompts and steering documents matter

### Development Best Practices
- **Start with `@quickstart`** to set up your foundation properly
- **Use `@prime`** at the start of every new conversation to quickly catch the coding assistant up to speed on what has been built in the project already
- **Update your DEVLOG.md** continuously, not just at the end
- **Customize your `.kiro/` configuration** as you learn your workflow
- **Run `@code-review-hackathon`** periodically to compare your project against the judging rubric and before submitting

## Getting Help

- **Kiro CLI Documentation**: [kiro.dev/docs/cli](https://kiro.dev/docs/cli)
- **Hackathon Community**: Join the Dynamous community for support
- **Built-in Help**: Use `/help` in Kiro CLI for command assistance

---

**Ready to build something amazing?** Run `@quickstart` and let's get started! 🚀
