import * as vscode from 'vscode';
import axios, { AxiosError } from 'axios';

interface Message {
    role: string;
    content: string;
}

let messages: Message[] = [];

export async function activate(context: vscode.ExtensionContext) {
    console.log('Positron Claude Chat Extension is now active');

    let disposable = vscode.commands.registerCommand('positron-claude-chat.startChat', async () => {
        let apiKey = await context.secrets.get('anthropic-api-key');
        if (!apiKey) {
            apiKey = await promptForApiKey(context);
            if (!apiKey) {
                vscode.window.showErrorMessage('API key is required to use Claude AI Chat.');
                return;
            }
        }

        const panel = vscode.window.createWebviewPanel(
            'claudeChat',
            'Claude AI Chat',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = getWebviewContent();

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'sendMessage':
                        if (apiKey) {
                            sendMessageToClaudeAI(message.text, panel, apiKey);
                        } else {
                            vscode.window.showErrorMessage('API key is not set.');
                        }
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);

    let setApiKeyCommand = vscode.commands.registerCommand('positron-claude-chat.setApiKey', async () => {
        await promptForApiKey(context);
    });

    context.subscriptions.push(setApiKeyCommand);
}

async function promptForApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Anthropic API Key',
        password: true
    });

    if (apiKey) {
        await context.secrets.store('anthropic-api-key', apiKey);
        vscode.window.showInformationMessage('API key saved successfully.');
    }

    return apiKey;
}

function getWebviewContent(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Claude AI Chat</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                height: 100vh;
            }
            #message-container {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                white-space: pre-wrap;
            }
            #input-container {
                display: flex;
                padding: 10px;
                border-top: 1px solid #ddd;
            }
            #message-input {
                flex: 1;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            #send-button {
                margin-left: 10px;
                padding: 10px 20px;
                border: none;
                background-color: #007acc;
                color: white;
                border-radius: 4px;
                cursor: pointer;
            }
            #send-button:hover {
                background-color: #005fa3;
            }
            .bold {
                font-weight: bold;
            }
            .message {
                margin-top: 10px;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div id="message-container"></div>
        <div id="input-container">
            <input type="text" id="message-input" placeholder="Type your message here..." />
            <button id="send-button">Send</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi();

            document.getElementById('send-button').addEventListener('click', () => {
                const input = document.getElementById('message-input');
                const message = input.value;
                if (message) {
                    addMessage('You', message, 'bold');
                    vscode.postMessage({
                        command: 'sendMessage',
                        text: message
                    });
                    input.value = '';
                }
            });

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'response') {
                    addMessage('Claude', message.content, 'bold');
                }
            });

            function addMessage(sender, text, className) {
                const messageContainer = document.getElementById('message-container');
                const senderElement = document.createElement('div');
                senderElement.textContent = sender + ':';
                senderElement.className = className + ' message';
                const messageElement = document.createElement('div');
                messageElement.textContent = text;
                messageElement.className = 'message';
                messageContainer.appendChild(senderElement);
                messageContainer.appendChild(messageElement);
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        </script>
    </body>
    </html>`;
}




async function sendMessageToClaudeAI(message: string, panel: vscode.WebviewPanel, apiKey: string) {
    try {
        messages.push({ role: 'user', content: message });

        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1024,
            messages: messages
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            }
        });

        const reply = response.data.content[0].text;
        messages.push({ role: 'assistant', content: reply });

        panel.webview.postMessage({ type: 'response', content: reply });
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error('Failed to send message to Claude AI:', axiosError.response?.data || axiosError.message);
        vscode.window.showErrorMessage('Failed to send message to Claude AI. See console for details.');
    }
}

export function deactivate() {}