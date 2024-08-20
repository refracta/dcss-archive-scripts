const paths = location.pathname.split('/').filter(p => p);
if (paths.length > 2 && paths[0] === 'ttyrec') {
    const list = document.querySelectorAll('.link');
    let player;

    const scriptElement = document.currentScript;
    const baseURL = scriptElement.src.substring(0, scriptElement.src.lastIndexOf('/'));

    function loadCSS(url) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = url;
            link.onload = () => resolve(url);
            document.head.appendChild(link);
        });
    }

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => resolve(url);
            document.body.appendChild(script);
        });
    }

    function fetchAndDecompress(url) {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => bz2.decompress(new Uint8Array(arrayBuffer)));
    }

    function initPlayer(data) {
        player?.dispose();

        const playerDiv = document.createElement('div');
        playerDiv.style.width = '600px';
        playerDiv.style.position = 'fixed';
        playerDiv.style.right = '20px';
        playerDiv.style.bottom = '20px';
        playerDiv.style.zIndex = '1000';
        playerDiv.style.backgroundColor = '#000';
        playerDiv.style.borderRadius = '5px';
        playerDiv.id = 'player';

        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'X';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.color = '#cccccc';
        closeButton.style.fontSize = '16px';
        closeButton.style.cursor = 'pointer';

        closeButton.onclick = function () {
            player?.dispose();
            document.body.removeChild(playerDiv);
        };
        document.body.appendChild(playerDiv);
        player = AsciinemaPlayer.create({url: data, parser: 'ttyrec'}, playerDiv);
        player.addEventListener('play', function () {
            playerDiv.appendChild(closeButton);
        });
        player.play();
    }

    function handlePlayButtonClick(url, isCompressed) {
        if (isCompressed) {
            fetchAndDecompress(url).then(decompressedData => {
                const blob = new Blob([decompressedData], {type: 'application/octet-stream'});
                const decompressedUrl = URL.createObjectURL(blob);
                initPlayer(decompressedUrl);
            }).catch(error => {
                console.error('Failed to decompress file:', error);
            });
        } else {
            initPlayer(url);
        }
    }

    Promise.all([
        loadCSS(`${baseURL}/asciinema-player.css`),
        loadScript(`${baseURL}/asciinema-player.min.js`),
        loadScript(`${baseURL}/bz2.js`)
    ]).then(() => {
        for (const element of list) {
            const a = element.querySelector('a');
            if (a.href.endsWith('.ttyrec') || a.href.endsWith('.ttyrec.bz2')) {
                const playButton = document.createElement('button');
                playButton.textContent = 'Play';
                playButton.style.marginLeft = '1em';
                playButton.onclick = () => handlePlayButtonClick(a.href, a.href.endsWith('.ttyrec.bz2'));
                element.appendChild(playButton);
            }
        }
    }).catch(error => {
        console.error('Error loading resources:', error);
    });
} else if (paths.length === 1 && paths[0] === 'rcfiles') {
    const params = new URLSearchParams(document.location.search);
    const user = params.get("user");
    if(user) {
        document.querySelector('h1').textContent = document.title = `${user}'s rcfiles`
        let rcfileLinks = Array.from(document.querySelectorAll('a')).filter(e => e.textContent.startsWith('crawl-')).map(e=>({name: e.textContent.slice(0, -1), url: `${e.href}${user}.rc`, tag: e}));
        rcfileLinks.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
        
            if (nameA === 'crawl-git') return -1;
            if (nameB === 'crawl-git') return 1;
        
            const crawlRegex = /^crawl-(\d+\.\d+)$/;
            const matchA = nameA.match(crawlRegex);
            const matchB = nameB.match(crawlRegex);
        
            if (matchA && matchB) {
                return parseFloat(matchB[1]) - parseFloat(matchA[1]);
            }
        
            if (matchA) return -1;
            if (matchB) return 1;
        
            return 0;
        });
    	
        const table = document.querySelector('table');
        Array.from(table.querySelectorAll('tbody tr')).forEach(e => e.remove())
        for (const link of rcfileLinks) {
            const container = document.createElement('tbody');
            container.innerHTML = `<tr><td class="link"><a href=""></a></td><td>-</td><td>-</td></tr>`;
            const linkTag = container.querySelector('.link a');
            linkTag.href = link.url;
            linkTag.textContent = `${user}.rc`;
            linkTag.parentNode.append(` (${link.name})`);
            table.appendChild(container.querySelector('tr'));
        }
    }
}
