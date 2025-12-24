
// Service for Google Sheets integration
// Requires a Client ID to be provided by the user in settings.

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOC = 'https://discovery.googleapis.com/discovery/v1/apis/sheets/v4/rest';

export class GoogleSheetsService {
  private tokenClient: any;
  private gapiInited = false;
  private gisInited = false;
  private clientId: string | null = null;

  constructor() {
    this.clientId = localStorage.getItem('google_drive_client_id'); // Reusing the same key storage
  }

  setClientId(id: string) {
    this.clientId = id;
    localStorage.setItem('google_drive_client_id', id);
  }

  async init(): Promise<void> {
    if (!this.clientId) throw new Error("Client ID not set");

    return new Promise((resolve) => {
      const checkScripts = () => {
        if (typeof (window as any).gapi !== 'undefined' && typeof (window as any).google !== 'undefined') {
           loadLibs();
        } else {
           // Fallback if scripts are missing
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
            callback: '', // defined later
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
        if (resp.error) reject(resp);
        resolve(resp);
      };

      if ((window as any).gapi.client.getToken() === null) {
        this.tokenClient.requestAccessToken({prompt: 'consent'});
      } else {
        this.tokenClient.requestAccessToken({prompt: ''});
      }
    });
  }

  get isLoggedIn(): boolean {
    return (window as any).gapi?.client?.getToken() !== null;
  }

  async createSpreadsheet(title: string): Promise<string> {
      const response = await (window as any).gapi.client.sheets.spreadsheets.create({
          properties: { title }
      });
      return response.result.spreadsheetId;
  }

  async syncProjectData(spreadsheetId: string, projectData: any): Promise<void> {
      const { project, tables, tasks, records, workers } = projectData;
      const sheets = (window as any).gapi.client.sheets.spreadsheets;

      // 1. Prepare Data Arrays
      
      // Overview Data
      const overviewData = [
          ['Project Name', project.name],
          ['Status', project.status],
          ['Description', project.description || ''],
          ['Last Sync', new Date().toLocaleString()],
          [],
          ['Metric', 'Value'],
          ['Total Tables', tables.length],
          ['Completed Tables', tables.filter((t: any) => t.status === 'completed').length],
          ['Total Tasks', tasks.length],
          ['Completed Tasks', tasks.filter((t: any) => t.completionDate).length],
          ['Total Cost', tasks.reduce((acc: number, t: any) => acc + t.price, 0) + ' EUR']
      ];

      // Tables Data
      const tablesHeader = ['Code', 'Type', 'Status'];
      const tablesRows = tables.map((t: any) => [t.tableCode, t.tableType, t.status]);
      
      // Tasks Data
      const tasksHeader = ['Description', 'Type', 'Worker', 'Price (EUR)', 'Date', 'Status'];
      const tasksRows = tasks.map((t: any) => {
          const worker = workers.find((w: any) => w.id === t.assignedWorkerId)?.name || 'Unassigned';
          return [t.description, t.taskType, worker, t.price, t.completionDate ? new Date(t.completionDate).toLocaleDateString() : '', t.completionDate ? 'Done' : 'Pending'];
      });

      // Work Log Data
      const logsHeader = ['Worker', 'Date', 'Duration', 'Description'];
      const logsRows = records.map((r: any) => {
          const worker = workers.find((w: any) => w.id === r.workerId)?.name || 'Unknown';
          const start = new Date(r.startTime);
          const end = new Date(r.endTime);
          const duration = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2) + 'h';
          return [worker, start.toLocaleDateString(), duration, r.description];
      });

      // 2. Ensure Sheets Exist (Dashboard, Tables, Tasks, Logs)
      // This is a simplified approach: we just update values. In a real app, we'd manage sheets via batchUpdate addSheet.
      // For now, we assume user might have deleted them or it's new. 
      // We will simply write to Sheet1 (Overview) and create others if needed is complicated via API without checking.
      // Better strategy: Clear everything and recreate structure? No, that destroys user edits.
      // Strategy: Write to specific named ranges/sheets. If they fail, create them.
      
      const dataToSync = [
          { range: 'Overview!A1', values: overviewData },
          { range: 'Tables!A1', values: [tablesHeader, ...tablesRows] },
          { range: 'Tasks!A1', values: [tasksHeader, ...tasksRows] },
          { range: 'Logs!A1', values: [logsHeader, ...logsRows] }
      ];

      // Function to check/create sheet
      const ensureSheet = async (title: string) => {
          try {
              // Try to clear it to verify existence and prep for new data
              await sheets.values.clear({ spreadsheetId, range: `${title}!A1:Z1000` });
          } catch (e) {
              // If fails, likely sheet doesn't exist, create it
              await sheets.batchUpdate({
                  spreadsheetId,
                  resource: { requests: [{ addSheet: { properties: { title } } }] }
              });
          }
      };

      await ensureSheet('Overview'); // Usually Sheet1 exists, but we rename or use it.
      await ensureSheet('Tables');
      await ensureSheet('Tasks');
      await ensureSheet('Logs');

      // 3. Write Data
      await sheets.values.batchUpdate({
          spreadsheetId,
          resource: {
              valueInputOption: 'USER_ENTERED',
              data: dataToSync
          }
      });
      
      // 4. Basic Formatting (Optional but nice)
      // Bold headers for Overview
      /* 
      await sheets.batchUpdate({
          spreadsheetId,
          resource: { requests: [ ... ] } 
      }); 
      */
  }
}

export const googleSheetsService = new GoogleSheetsService();
