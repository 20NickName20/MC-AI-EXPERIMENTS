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
    "endpoints": [
        "List of custom gpt api endpoints. For now, first one is used. Leave empty for default."
    ],
    "apiKey": "YOUR API KEY",
    "model": "gpt-3.5-turbo (or any other model)",
    "messageLimit": 128,
    "saveMessages": true,
    "server": {
        "ip": "localhost",
        "port": 25565,
        "version": "1.20.2",
        "crackedServerLogin": "password used for cracked servers using login plugins"
    },
    "disabledCommands": ["list all disabled commands here"]
}
```

### Running

```
node index.js
```

## License

This project is licensed under the GPL-3.0 license - see the LICENSE file for details