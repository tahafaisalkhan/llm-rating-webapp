import pandas as pd
import subprocess

df = pd.read_excel("codes.xlsx")

for _, row in df.iterrows():
    email = row["Email"]
    name = row["Name"]
    code = row["Code"]

    subject = "Your Unique Code"
    body = f"Hello {name},\n\nYour unique code is:\n{code}\n\nThanks."

    applescript = f'''
    tell application "Microsoft Outlook"
        set newMessage to make new outgoing message with properties {{subject:"{subject}", content:"{body}"}}
        tell newMessage
            make new recipient with properties {{email address:{{address:"{email}"}}}}
            send
        end tell
    end tell
    '''

    subprocess.run(["osascript", "-e", applescript])
