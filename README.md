# AI EXPERIMENTS

## Descritption

This project is aiming to bring chat gpt to minecraft

## Getting started

### Dependencies

* Requires Node.js
### Installing
1. Clone repo locally
```
git clone https://github.com/20NickName20/MC-AI-EXPERIMENTS.git
cd MC-AI-EXPERIMENTS
```

2. Install Node modules
```
npm install
```

3. Create `config.json` file
```json
{
    "endpoints": [ // List of custom gpt api endpoints. Leave empty for default.

    ],
    "apiKey": "YOUR API KEY", // Insert your private OpenAI api key
    "model": "gpt-4", // Gpt model
    "server": {
        "ip": "localhost",
        "port": 25565,
        "version": "1.20.2",
        "crackedServerLogin": "password" // Used for cracked servers using login plugins
    }
}
```

### Running

```
node index.js
```

## License

This project is licensed under the GNU GENERAL PUBLIC LICENSE License - see the LICENSE file for details