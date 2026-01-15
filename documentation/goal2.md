The goal for the app is now this : 



We want to be a better UI for the codex-main project. We already have all the frontend and a rust server running.

We want to integrate a 100% of the capabilities of the project codex-main into our app with those changes : 

- a hidden CLI (accessible with a button Terminal (only an icon button that is at the left of the prompt interface where you can type) that features tabs and most terminal features using ratatui.
This hidden CLI runs the codex-main project in a hidden CLI that is mirrored in the Skhoot app frontend. The hidden CLI also runs a Skhoot tab that is used to track what is happening on the app using the principle of console logging and interactivity via the CLI so that Skhoot can be a CLI only tool with perfect functionality.

- Be able to enter any API key for a AI provider uaing the /userprofile panel API Configuration preexisting primitive component so that you can use this API key to provide the AI rather than have the openai api key restriction or auth by open AI. This configuration is saved on the user's computer when in the tauriv2 in a folder 

- Use this APi key to run the codex-main project in a hidden CLI that is mirrored in the Skhoot app frontend

- To give access to the AI that is running the codex-main project to the tools that have been developped by us from the backend for even enhanced features

- A plugin system that allows devs and all to generate functionalities to add to the running backend on the tauriv2 app and share them. For example the features FIle Search, Disk Analysis and Cleanup could become plugins that could when installed be used by the AI rather than the current commands it can run (which are all commands on a computer)

- Run the AI without or with sandbox editable in a settings/menu with permissions and logging in the activity log

- Be able to use all our current UI features efficiently so that it can alter itself. For example you could ask the AI to change the theme to light and it would dynamically use the app using commands that are installed with the project and run in parrallel in a a hidden CLI (accessible with a button Terminal (only an icon button that is at the left of the prompt interface where you can type) that features tabs and most terminal features using ratatui.