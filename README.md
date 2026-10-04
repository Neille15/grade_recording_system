# grade_recording_system

## Phase 1 API first run (Windows)

1. Install Docker Desktop, the .NET 10 SDK, and the VS Code REST Client extension.
2. Set a strong SQL Server password in PowerShell:

   ```powershell
   $env:MSSQL_SA_PASSWORD = "replace-with-a-strong-password"
   docker compose up -d
   ```

3. Run `database/pedagoclick.sql` against `localhost,1433` using the `sa` account.
4. Restore the API tool manifest and configure secrets:

   ```powershell
   cd BackEnd\BackEnd
   dotnet tool restore
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=Pedagoclick;User Id=sa;Password=replace-with-a-strong-password;TrustServerCertificate=True"
   dotnet user-secrets set "Jwt:SigningKey" "replace-with-a-long-random-signing-key"
   dotnet user-secrets set "Seed:AdminPassword" "replace-with-the-admin-password"
   dotnet user-secrets set "AutoMapper:LicenseKey" "replace-with-your-license-key"
   dotnet run
   ```

5. Open `BackEnd/BackEnd/requests.http` and set `@token` after logging in.

The Phase 1 API provides registration, login, current-user lookup, and adviser-only
student roster operations. Newly registered accounts are pending until an admin
activates them. The database scaffold must be regenerated from the running database
when the full schema-backed model is introduced; generated EF files should not be
hand-edited.