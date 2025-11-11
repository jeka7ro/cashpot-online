import express from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Power BI Configuration Storage (in production, use database)
let powerBIConfig = {
  tenantId: process.env.POWERBI_TENANT_ID || '',
  clientId: process.env.POWERBI_CLIENT_ID || '',
  clientSecret: process.env.POWERBI_CLIENT_SECRET || '',
  workspaceId: process.env.POWERBI_WORKSPACE_ID || '',
  datasetId: process.env.POWERBI_DATASET_ID || '',
  tableName: process.env.POWERBI_TABLE_NAME || 'Expenditures',
  accessToken: null,
  tokenExpiry: null
};

// Get Power BI Access Token
async function getPowerBIAccessToken() {
  // Check if token is still valid
  if (powerBIConfig.accessToken && powerBIConfig.tokenExpiry && new Date() < powerBIConfig.tokenExpiry) {
    return powerBIConfig.accessToken;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${powerBIConfig.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: powerBIConfig.clientId,
      client_secret: powerBIConfig.clientSecret,
      scope: 'https://analysis.windows.net/powerbi/api/.default'
    });

    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    powerBIConfig.accessToken = response.data.access_token;
    // Token expires in 1 hour, refresh 5 minutes before
    powerBIConfig.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

    return powerBIConfig.accessToken;
  } catch (error) {
    console.error('Error getting Power BI access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Power BI');
  }
}

// GET /api/powerbi/config - Get current configuration (without secrets)
router.get('/config', authenticateToken, (req, res) => {
  res.json({
    configured: !!(powerBIConfig.tenantId && powerBIConfig.clientId && powerBIConfig.workspaceId && powerBIConfig.datasetId),
    tenantId: powerBIConfig.tenantId,
    clientId: powerBIConfig.clientId,
    workspaceId: powerBIConfig.workspaceId,
    datasetId: powerBIConfig.datasetId,
    tableName: powerBIConfig.tableName,
    hasSecret: !!powerBIConfig.clientSecret,
    tokenValid: powerBIConfig.accessToken && powerBIConfig.tokenExpiry && new Date() < powerBIConfig.tokenExpiry
  });
});

// POST /api/powerbi/config - Update configuration
router.post('/config', authenticateToken, (req, res) => {
  const { tenantId, clientId, clientSecret, workspaceId, datasetId, tableName } = req.body;

  if (tenantId) powerBIConfig.tenantId = tenantId;
  if (clientId) powerBIConfig.clientId = clientId;
  if (clientSecret) powerBIConfig.clientSecret = clientSecret;
  if (workspaceId) powerBIConfig.workspaceId = workspaceId;
  if (datasetId) powerBIConfig.datasetId = datasetId;
  if (tableName) powerBIConfig.tableName = tableName;

  // Clear existing token to force re-authentication
  powerBIConfig.accessToken = null;
  powerBIConfig.tokenExpiry = null;

  res.json({
    success: true,
    message: 'Configuration updated successfully'
  });
});

// GET /api/powerbi/test - Test connection
router.get('/test', authenticateToken, async (req, res) => {
  try {
    const token = await getPowerBIAccessToken();
    
    // Test by getting workspace info
    const response = await axios.get(
      `https://api.powerbi.com/v1.0/myorg/groups/${powerBIConfig.workspaceId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    res.json({
      success: true,
      message: 'Connection successful',
      workspace: response.data
    });
  } catch (error) {
    console.error('Power BI test connection error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Connection failed',
      details: error.response?.data || error.message
    });
  }
});

// GET /api/powerbi/datasets - Get all datasets in workspace
router.get('/datasets', authenticateToken, async (req, res) => {
  try {
    const token = await getPowerBIAccessToken();
    
    const response = await axios.get(
      `https://api.powerbi.com/v1.0/myorg/groups/${powerBIConfig.workspaceId}/datasets`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    res.json({
      success: true,
      datasets: response.data.value
    });
  } catch (error) {
    console.error('Error fetching datasets:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch datasets',
      details: error.response?.data || error.message
    });
  }
});

// GET /api/powerbi/tables - Get all tables in dataset
router.get('/tables', authenticateToken, async (req, res) => {
  try {
    const token = await getPowerBIAccessToken();
    
    const response = await axios.get(
      `https://api.powerbi.com/v1.0/myorg/groups/${powerBIConfig.workspaceId}/datasets/${powerBIConfig.datasetId}/tables`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    res.json({
      success: true,
      tables: response.data.value
    });
  } catch (error) {
    console.error('Error fetching tables:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
      details: error.response?.data || error.message
    });
  }
});

// POST /api/powerbi/query - Execute DAX query
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const token = await getPowerBIAccessToken();
    
    const response = await axios.post(
      `https://api.powerbi.com/v1.0/myorg/groups/${powerBIConfig.workspaceId}/datasets/${powerBIConfig.datasetId}/executeQueries`,
      {
        queries: [
          {
            query: query
          }
        ],
        serializerSettings: {
          includeNulls: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error executing query:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to execute query',
      details: error.response?.data || error.message
    });
  }
});

// GET /api/powerbi/expenditures - Get expenditures data from Power BI
router.get('/expenditures', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, category, location } = req.query;
    
    // Build DAX query
    let daxQuery = `EVALUATE ${powerBIConfig.tableName}`;
    
    // Add filters if provided
    const filters = [];
    if (startDate) filters.push(`[Date] >= DATE(${new Date(startDate).getFullYear()}, ${new Date(startDate).getMonth() + 1}, ${new Date(startDate).getDate()})`);
    if (endDate) filters.push(`[Date] <= DATE(${new Date(endDate).getFullYear()}, ${new Date(endDate).getMonth() + 1}, ${new Date(endDate).getDate()})`);
    if (category) filters.push(`[Category] = "${category}"`);
    if (location) filters.push(`[Location] = "${location}"`);
    
    if (filters.length > 0) {
      daxQuery = `EVALUATE FILTER(${powerBIConfig.tableName}, ${filters.join(' && ')})`;
    }

    const token = await getPowerBIAccessToken();
    
    const response = await axios.post(
      `https://api.powerbi.com/v1.0/myorg/groups/${powerBIConfig.workspaceId}/datasets/${powerBIConfig.datasetId}/executeQueries`,
      {
        queries: [
          {
            query: daxQuery
          }
        ],
        serializerSettings: {
          includeNulls: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Transform Power BI data to match our expenditures format
    const powerBIData = response.data.results[0]?.tables[0]?.rows || [];
    
    res.json({
      success: true,
      count: powerBIData.length,
      data: powerBIData
    });
  } catch (error) {
    console.error('Error fetching expenditures:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expenditures',
      details: error.response?.data || error.message
    });
  }
});

// POST /api/powerbi/sync - Sync data from Power BI to local database
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, merge } = req.body;
    
    // Build DAX query for all expenditures
    let daxQuery = `EVALUATE ${powerBIConfig.tableName}`;
    
    if (startDate && endDate) {
      daxQuery = `EVALUATE FILTER(${powerBIConfig.tableName}, [Date] >= DATE(${new Date(startDate).getFullYear()}, ${new Date(startDate).getMonth() + 1}, ${new Date(startDate).getDate()}) && [Date] <= DATE(${new Date(endDate).getFullYear()}, ${new Date(endDate).getMonth() + 1}, ${new Date(endDate).getDate()}))`;
    }

    const token = await getPowerBIAccessToken();
    
    const response = await axios.post(
      `https://api.powerbi.com/v1.0/myorg/groups/${powerBIConfig.workspaceId}/datasets/${powerBIConfig.datasetId}/executeQueries`,
      {
        queries: [
          {
            query: daxQuery
          }
        ],
        serializerSettings: {
          includeNulls: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const powerBIData = response.data.results[0]?.tables[0]?.rows || [];
    
    // Here you would implement the logic to save to your database
    // For now, we'll just return the data
    
    res.json({
      success: true,
      message: `Synced ${powerBIData.length} records from Power BI`,
      count: powerBIData.length,
      preview: powerBIData.slice(0, 5) // First 5 records as preview
    });
  } catch (error) {
    console.error('Error syncing data:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to sync data',
      details: error.response?.data || error.message
    });
  }
});

// GET /api/powerbi/schema - Get table schema
router.get('/schema', authenticateToken, async (req, res) => {
  try {
    const token = await getPowerBIAccessToken();
    
    // Get table schema
    const response = await axios.get(
      `https://api.powerbi.com/v1.0/myorg/groups/${powerBIConfig.workspaceId}/datasets/${powerBIConfig.datasetId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    res.json({
      success: true,
      schema: response.data
    });
  } catch (error) {
    console.error('Error fetching schema:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schema',
      details: error.response?.data || error.message
    });
  }
});

export default router;

