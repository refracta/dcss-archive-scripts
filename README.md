# dcss-ttyrec-player

This script is created to allow viewing ttyrec files from the CNC server via the web.

## How to apply

```bash
location / {
    fancyindex on;
    sub_filter '</body>' '<script src="https://cdn.jsdelivr.net/gh/refracta/dcss-ttyrec-player/script.js"></script></body>';
}
```

## Libraries

- bz2.js: https://github.com/SheetJS/bz2
- asciinema-player: https://github.com/asciinema/asciinema-player/releases/tag/v3.8.0
