# Qualtrics Elector

Welcome to this complete guide for how to setup a free election for a UNSW society.

1. Copy the files in `example/Simple` into another directory, and edit them. Specific instructions are in `qualtrics_setup/main.js`.
2. Inside `qualtrics_setup`, run `npm install` and then `node main.js ../your/data/folder/ > QualtricsImport.jqf`
3. Login to qualtrics (unsw.qualtrics.com), and create a new project.
4. Choose to upload a qsf file, and upload the qsf you created.
5. Check your survey, to make sure it looks correct
6. Now, in the top left, click the three-bar icon and choose "Contacts", then "Create Contact List"
7. Fill in the requisite details, uploading the emails of everyone you want to contact. If you have zIDs, send to `zID@unsw.edu.au`.
8. Under "Distributions", choose "Email With Qualtrics"
9. Write your email, and choose to send it to your new contact list.
10. Wait for results

[More instructions to follow once the election is done]
