
// Service for Google Drive integration
// Requires a Client ID to be provided by the user in settings.

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

export class GoogleDriveService {
  private tokenClient: any;
  private gapiInited = false;
  private gisInited = false;
  private clientId: string | null = null;

  constructor() {
    this.clientId = localStorage.getItem('google_drive_client_id');
  }

  setClientId(id: string) {
    this.clientId = id;
    localStorage.setItem('google_drive_client_id', id);
  }

  getClientId() {
    return this.clientId;
  }

  // Load scripts dynamically if not present
  async init(): Promise<void> {
    if (!this.clientId) throw new Error("Client ID not set");

    return new Promise((resolve) => {
      const checkScripts = () => {
        if (typeof (window as any).gapi !== 'undefined' && typeof (window as any).google !== 'undefined') {
           loadLibs();
        } else {
           // Fallback if scripts are missing from HTML (though they are added there)
           if (!document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
               const gapiScript = document.createElement('script');
               gapiScript.src = 'https://apis.google.com/js/api.js';
               gapiScript.onload = () => checkScripts();
               document.body.appendChild(gapiScript);
           }
           if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
               const gisScript = document.createElement('script');
               gisScript.src = 'https://accounts.google.com/gsi/client';
               gisScript.onload = () => checkScripts();
               document.body.appendChild(gisScript);
           }
        }
      };

      const loadLibs = () => {
          (window as any).gapi.load('client', async () => {
            await (window as any).gapi.client.init({
              discoveryDocs: [DISCOVERY_DOC],
            });
            this.gapiInited = true;
            checkAuth();
          });

          this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: SCOPES,
            callback: '', // defined later during sign in
          });
          this.gisInited = true;
          checkAuth();
      };

      const checkAuth = () => {
        if (this.gapiInited && this.gisInited) resolve();
      };
      
      checkScripts();
    });
  }

  async signIn(): Promise<void> {
    if (!this.tokenClient) await this.init();
    
    return new Promise((resolve, reject) => {
      this.tokenClient.callback = async (resp: any) => {
        if (resp.error) {
          reject(resp);
        }
        resolve(resp);
      };

      if ((window as any).gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        this.tokenClient.requestAccessToken({prompt: 'consent'});
      } else {
        // Skip display of account chooser and consent dialog for an existing session.
        this.tokenClient.requestAccessToken({prompt: ''});
      }
    });
  }

  async signOut(): Promise<void> {
    const token = (window as any).gapi.client.getToken();
    if (token !== null) {
      (window as any).google.accounts.oauth2.revoke(token.access_token);
      (window as any).gapi.client.setToken('');
    }
  }

  get isLoggedIn(): boolean {
    return (window as any).gapi?.client?.getToken() !== null;
  }

  // --- Drive Operations ---

  async ensureFolder(folderName: string = 'MST_Backups'): Promise<string> {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    const response = await (window as any).gapi.client.drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    } else {
      // Create folder
      const createResponse = await (window as any).gapi.client.drive.files.create({
        resource: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      return createResponse.result.id;
    }
  }

  async uploadFile(name: string, content: string, folderId?: string): Promise<void> {
    const folder = folderId || await this.ensureFolder();
    
    const metadata = {
      name,
      parents: [folder],
      mimeType: 'application/json',
    };

    const fileContent = new Blob([content], {type: 'application/json'});
    const accessToken = (window as any).gapi.client.getToken().access_token;
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
    form.append('file', fileContent);

    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({'Authorization': 'Bearer ' + accessToken}),
      body: form,
    });
  }

  async listBackups(folderId?: string): Promise<any[]> {
    const folder = folderId || await this.ensureFolder();
    const q = `'${folder}' in parents and mimeType='application/json' and trashed=false`;
    
    const response = await (window as any).gapi.client.drive.files.list({
      q,
      fields: 'files(id, name, createdTime, size)',
      orderBy: 'createdTime desc',
    });
    
    return response.result.files;
  }

  async downloadFile(fileId: string): Promise<string> {
    const response = await (window as any).gapi.client.drive.files.get({
      fileId,
      alt: 'media',
    });
    return response.body;
  }
}

export const googleDriveService = new GoogleDriveService();
