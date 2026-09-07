# Applying configuration changes to a Preview

Saving an environment variable in Vercel does not update an existing deployment.
The changed value applies only to deployments created after it was saved.

After changing Preview settings:

1. Check that the variable applies to Preview and the intended Git branch.
2. Open the latest deployment for that branch and choose **Redeploy**, keeping
   **Preview** as the target. A new Git commit on that branch also triggers a
   deployment when Git integration is enabled.
3. Wait for the new deployment to become **Ready**. Check that it has a new
   deployment ID before retrying the application.
4. Verify the application's database connection. A successful build alone does
   not establish that the running application can connect.

Keep variable values and credentials out of screenshots, commits and test logs.

Reference: [Managing environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables).
