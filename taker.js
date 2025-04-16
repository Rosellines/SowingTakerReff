const fs = require('fs').promises;
const axios = require('axios');
const { ethers } = require('ethers');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const COLORS = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  cyan: '\x1b[36m', 
  gray: '\x1b[90m', 
  reset: '\x1b[0m'
};

const colorize = (text, color) => `${COLORS[color]}${text}${COLORS.reset}`;

const printSectionHeader = (title) => {
  console.log(colorize(`\n=== ${title} ===`, 'cyan'));
};

const displayBanner = () => {
  printSectionHeader('AUTO REF TAKER - AIRDROP INSIDERS');
};

function getRandomUserAgent() {
  const browsers = [
    {
      name: 'Chrome',
      version: { min: 90, max: 135 },
      secChUa: () => {
        const v = Math.floor(Math.random() * (135 - 90) + 90);
        return `"Google Chrome";v="${v}", "Chromium";v="${v}", "Not-A.Brand";v="24"`;
      },
      ua: (v) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`
    },
    {
      name: 'Firefox',
      version: { min: 90, max: 125 },
      secChUa: () => {
        const v = Math.floor(Math.random() * (125 - 90) + 90);
        return `"Firefox";v="${v}", "Not?A_Brand";v="8"`;
      },
      ua: (v) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`
    },
    {
      name: 'Edge',
      version: { min: 90, max: 135 },
      secChUa: () => {
        const v = Math.floor(Math.random() * (135 - 90) + 90);
        return `"Microsoft Edge";v="${v}", "Chromium";v="${v}", "Not-A.Brand";v="24"`;
      },
      ua: (v) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36 Edg/${v}.0.0.0`
    },
    {
      name: 'Brave',
      version: { min: 90, max: 135 },
      secChUa: () => {
        const v = Math.floor(Math.random() * (135 - 90) + 90);
        return `"Brave";v="${v}", "Chromium";v="${v}", "Not-A.Brand";v="24"`;
      },
      ua: (v) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`
    }
  ];

  const selectedBrowser = browsers[Math.floor(Math.random() * browsers.length)];
  const version = Math.floor(Math.random() * (selectedBrowser.version.max - selectedBrowser.version.min) + selectedBrowser.version.min);

  return {
    browser: selectedBrowser.name,
    userAgent: selectedBrowser.ua(version),
    secChUa: selectedBrowser.secChUa(),
    version
  };
}

function generateHeaders() {
  const ua = getRandomUserAgent();
  return {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.6',
    'content-type': 'application/json',
    'sec-ch-ua': ua.secChUa,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'sec-gpc': '1',
    'user-agent': ua.userAgent,
    Referer: 'https://sowing.taker.xyz/',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
}

const BASE_URL = 'https://sowing-api.taker.xyz';
let INVITE_CODE;

async function getInviteCode() {
  try {
    const code = await fs.readFile('code.txt', 'utf-8');
    INVITE_CODE = code.trim();
    return INVITE_CODE;
  } catch (error) {
    console.log(colorize(`❌ Error reading code.txt: ${error.message}`, 'red'));
    console.log(colorize('⚠️ Using default invite code: nNPn8ur5', 'yellow'));
    INVITE_CODE = 'nNPn8ur5';
    return INVITE_CODE;
  }
}

async function loadProxies() {
  try {
    const content = await fs.readFile('proxies.txt', 'utf-8');
    const proxyList = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    return proxyList;
  } catch (error) {
    console.log(colorize(`❌ Error reading proxies.txt: ${error.message}`, 'red'));
    return [];
  }
}

function createProxyAgent(proxyString) {
  if (!proxyString) return null;

  if (proxyString.includes('http://') || proxyString.includes('https://')) {
    return new HttpsProxyAgent(proxyString);
  }

  if (proxyString.includes('socks://') || proxyString.includes('socks4://') || proxyString.includes('socks5://')) {
    return new SocksProxyAgent(proxyString);
  }

  const ipPortRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})$/;
  if (ipPortRegex.test(proxyString)) {
    return new HttpsProxyAgent(`http://${proxyString}`);
  }

  const ipPortUserPassRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5}):(.+):(.+)$/;
  const match = proxyString.match(ipPortUserPassRegex);
  if (match) {
    const [_, ip, port, user, pass] = match;
    return new HttpsProxyAgent(`http://${user}:${pass}@${ip}:${port}`);
  }

  console.log(colorize(`❌ Unrecognized proxy format: ${proxyString}`, 'red'));
  return null;
}

async function saveWallets(wallets) {
  try {
    await fs.writeFile('wallets.json', JSON.stringify(wallets, null, 2));
    console.log(colorize(`💾 Wallets saved to wallets.json`, 'green'));
  } catch (error) {
    console.log(colorize(`❌ Error saving wallets: ${error.message}`, 'red'));
  }
}

function generateWallet() {
  const wallet = ethers.Wallet.createRandom();
  console.log(colorize(`🔑 Generated wallet: ${wallet.address}`, 'white'));
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
}

async function generateNonce(address, headers, proxyAgent) {
  try {
    const response = await axios.post(
      `${BASE_URL}/wallet/generateNonce`,
      { walletAddress: address },
      {
        headers,
        httpsAgent: proxyAgent
      }
    );
    const nonceMatch = response.data.result.nonce.match(/Nonce: (.+)$/m);
    if (!nonceMatch) throw new Error('Invalid nonce format');
    console.log(colorize(`🔐 Nonce generated for ${address}`, 'green'));
    return nonceMatch[1];
  } catch (error) {
    console.log(colorize(`❌ Error generating nonce: ${error.response?.data?.message || error.message}`, 'red'));
    throw error;
  }
}

async function login(wallet, nonce, headers, proxyAgent) {
  const message = `Taker quest needs to verify your identity to prevent unauthorized access. Please confirm your sign-in details below:\n\naddress: ${wallet.address}\n\nNonce: ${nonce}`;
  const signer = new ethers.Wallet(wallet.privateKey);
  const signature = await signer.signMessage(message);

  try {
    const response = await axios.post(
      `${BASE_URL}/wallet/login`,
      {
        address: wallet.address,
        signature,
        message,
        invitationCode: INVITE_CODE
      },
      {
        headers,
        httpsAgent: proxyAgent
      }
    );
    console.log(colorize(`✅ Logged in successfully`, 'green'));
    return response.data.result.token;
  } catch (error) {
    console.log(colorize(`❌ Error logging in: ${error.response?.data?.message || error.message}`, 'red'));
    throw error;
  }
}

async function signIn(token, headers, proxyAgent) {
  try {
    await axios.get(
      `${BASE_URL}/task/signIn?status=true`,
      {
        headers: { ...headers, authorization: `Bearer ${token}` },
        httpsAgent: proxyAgent
      }
    );
    console.log(colorize(`✅ Signed in successfully`, 'green'));
  } catch (error) {
    console.log(colorize(`❌ Sign-in failed: ${error.response?.data?.message || error.message}`, 'red'));
  }
}

async function getTaskDetails(token, walletAddress, taskId, headers, proxyAgent) {
  try {
    const response = await axios.get(
      `${BASE_URL}/task/detail?walletAddress=${walletAddress}&taskId=${taskId}`,
      {
        headers: { ...headers, authorization: `Bearer ${token}` },
        httpsAgent: proxyAgent
      }
    );
    console.log(colorize(`📋 Task ${taskId} details fetched`, 'white'));
    return response.data.result;
  } catch (error) {
    console.log(colorize(`❌ Error fetching task ${taskId} details: ${error.response?.data?.message || error.message}`, 'red'));
    return null;
  }
}

async function processTasksAndRewards(token, walletAddress, headers, proxyAgent) {
  printSectionHeader(`Completing Tasks and Claiming Rewards for ${walletAddress}`);
  const tasks = [
    { taskId: 7, taskEventId: 15 },
    { taskId: 7, taskEventId: 16 },
    { taskId: 6, taskEventId: 1, answerList: ['C'] },
    { taskId: 6, taskEventId: 2, answerList: ['A'] },
    { taskId: 6, taskEventId: 3, answerList: ['D'] }
  ];

  for (const task of tasks) {
    try {
      const taskDetails = await getTaskDetails(token, walletAddress, task.taskId, headers, proxyAgent);
      if (taskDetails && taskDetails.taskEvents.find(event => event.id === task.taskEventId)?.completeStatus === 1) {
        console.log(colorize(`✅ Task ${task.taskId}-${task.taskEventId}: Already completed`, 'green'));
        continue;
      }

      const response = await axios.post(
        `${BASE_URL}/task/check`,
        task,
        {
          headers: { ...headers, authorization: `Bearer ${token}` },
          httpsAgent: proxyAgent
        }
      );
      console.log(colorize(`✅ Task ${task.taskId}-${task.taskEventId}: ${response.data.message}`, 'green'));
    } catch (error) {
      console.log(colorize(`❌ Task ${task.taskId}-${task.taskEventId} failed: ${error.response?.data?.message || error.message}`, 'red'));
    }
  }

  const taskIds = [6, 7];
  for (const taskId of taskIds) {
    try {
      const taskDetails = await getTaskDetails(token, walletAddress, taskId, headers, proxyAgent);
      if (!taskDetails) {
        console.log(colorize(`⚠️ Reward Claim Task ${taskId}: Skipped due to failed task details`, 'yellow'));
        continue;
      }
      if (taskDetails.rewardClaimed) {
        console.log(colorize(`✅ Reward Claim Task ${taskId}: Already claimed`, 'green'));
        continue;
      }
      if (!taskDetails.taskEvents.every(event => event.completeStatus === 1)) {
        console.log(colorize(`⚠️ Reward Claim Task ${taskId}: Not all events completed`, 'yellow'));
        continue;
      }

      const response = await axios.post(
        `${BASE_URL}/task/claim-reward?taskId=${taskId}`,
        null,
        {
          headers: { ...headers, authorization: `Bearer ${token}` },
          httpsAgent: proxyAgent
        }
      );
      const { code, message, result } = response.data;
      console.log(colorize(`ℹ️ Reward Claim Task ${taskId} Response: ${JSON.stringify(response.data)}`, 'white'));
      const displayMessage = message || (result ? 'Reward claimed successfully' : 'No message returned');
      console.log(colorize(`🎉 Reward Claim Task ${taskId}: ${displayMessage} (Code: ${code})`, 'green'));
    } catch (error) {
      console.log(colorize(`❌ Reward Claim Task ${taskId} failed: ${error.response?.data?.message || error.message}`, 'red'));
      if (error.response) {
        console.log(colorize(`ℹ️ Error Response: ${JSON.stringify(error.response.data)}`, 'gray'));
      }
    }
  }
}

async function createWalletAndSign(walletCount) {
  const wallets = [];
  const proxies = await loadProxies();
  const inviteCode = await getInviteCode();

  printSectionHeader('Initial Configuration');
  console.log(colorize(`📋 Invite code: ${inviteCode}`, 'white'));
  console.log(colorize(`📡 Proxies loaded: ${proxies.length}`, 'white'));
  console.log(colorize(`🔢 Wallets to create: ${walletCount}`, 'white'));
  console.log(colorize(`📱 User-Agent: Random for each wallet`, 'white'));
  console.log(colorize('--------------------------------------------', 'yellow'));

  for (let i = 0; i < walletCount; i++) {
    const proxyIndex = proxies.length ? i % proxies.length : -1;
    const proxyString = proxyIndex >= 0 ? proxies[proxyIndex] : null;
    const proxyAgent = proxyString ? createProxyAgent(proxyString) : null;
    const headers = generateHeaders();

    printSectionHeader(`Processing Wallet ${i + 1} of ${walletCount}`);
    console.log(colorize(`🌐 Using proxy: ${proxyString || 'none'}`, 'gray'));
    console.log(colorize(`📱 Browser: ${headers['user-agent'].split(' ')[0]}`, 'gray'));

    try {
      const wallet = generateWallet();
      console.log(colorize(`🔐 Generating nonce for ${wallet.address}`, 'white'));
      const nonce = await generateNonce(wallet.address, headers, proxyAgent);
      console.log(colorize(`🔑 Logging in for ${wallet.address}`, 'white'));
      const token = await login(wallet, nonce, headers, proxyAgent);

      const walletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        proxy: proxyString || 'none',
        userAgent: headers['user-agent']
      };

      console.log(colorize(`📋 Performing sign-in`, 'white'));
      await signIn(token, headers, proxyAgent);
      await processTasksAndRewards(token, wallet.address, headers, proxyAgent);

      wallets.push(walletData);
      console.log(colorize(`📋 Saving wallets`, 'white'));
      await saveWallets(wallets);

      console.log(colorize(`✅ Wallet ${wallet.address} processed successfully`, 'green'));
    } catch (error) {
      console.log(colorize(`❌ Failed to process wallet ${i + 1}: ${error.message}`, 'red'));
    }
  }

  printSectionHeader('Process Completed');
  console.log(colorize(`🎉 Successfully created and saved ${wallets.length} wallet(s) to wallets.json`, 'green'));
}

async function main() {
  displayBanner();
  try {
    rl.question(colorize('📝 Enter the number of wallets to create: ', 'white'), async (answer) => {
      const walletCount = parseInt(answer);
      if (isNaN(walletCount) || walletCount <= 0) {
        printSectionHeader('Input Error');
        console.log(colorize('❌ Please enter a valid number', 'red'));
        rl.close();
        return;
      }

      try {
        await createWalletAndSign(walletCount);
      } catch (error) {
        printSectionHeader('Fatal Error');
        console.log(colorize(`❌ Process failed with error: ${error.message}`, 'red'));
      } finally {
        rl.close();
      }
    });
  } catch (error) {
    printSectionHeader('Initialization Error');
    console.log(colorize(`❌ Initialization error: ${error.message}`, 'red'));
    rl.close();
  }
}

main();