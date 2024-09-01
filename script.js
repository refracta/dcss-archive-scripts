const paths = location.pathname.split('/').filter(path => path);

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

if (paths.length >= 1 && paths[0] === 'ttyrec') {
    const params = new URLSearchParams(document.location.search);
    const file = params.get("file");
    const time = params.get("time");

    const list = document.querySelectorAll('.link');
    let player;

    const scriptElement = document.currentScript;
    const baseURL = scriptElement.src.substring(0, scriptElement.src.lastIndexOf('/'));

    function fetchAndDecompress(url) {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => bz2.decompress(new Uint8Array(arrayBuffer)));
    }

    function initPlayer(data, time) {
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
        if (!isNaN(time)) {
            player.seek(time);
        }
    }

    function handlePlayButtonClick(url, isCompressed, time) {
        if (isCompressed) {
            fetchAndDecompress(url).then(decompressedData => {
                const blob = new Blob([decompressedData], {type: 'application/octet-stream'});
                const decompressedUrl = URL.createObjectURL(blob);
                initPlayer(decompressedUrl, time);
            }).catch(error => {
                console.error('Failed to decompress file:', error);
            });
        } else {
            initPlayer(url, time);
        }
    }

    Promise.all([loadCSS(`${baseURL}/asciinema-player.css`), loadScript(`${baseURL}/asciinema-player.min.js`), loadScript(`${baseURL}/bz2.js`)]).then(() => {
        for (const element of list) {
            const a = element.querySelector('a');
            const isTTYREC = a.href.endsWith('.ttyrec');
            const isCompressedTTYREC = a.href.endsWith('.ttyrec.bz2');
            if (isTTYREC || isCompressedTTYREC) {
                const playButton = document.createElement('button');
                playButton.textContent = 'Play';
                playButton.style.marginLeft = '1em';
                playButton.onclick = () => handlePlayButtonClick(a.href, isCompressedTTYREC);
                element.appendChild(playButton);
                if (file === a.textContent) {
                    handlePlayButtonClick(a.href, isCompressedTTYREC, time || 0);
                }
            }
        }
    }).catch(error => {
        console.error('Error loading resources:', error);
    });
} else if (paths.length === 1 && paths[0] === 'rcfiles') {
    const params = new URLSearchParams(document.location.search);
    const user = params.get("user");
    if (user) {
        document.querySelector('h1').textContent = document.title = `${user}'s rcfiles`
        let rcfileLinks = Array.from(document.querySelectorAll('a')).filter(e => e.textContent.startsWith('crawl-')).map(e => ({
            name: e.textContent.slice(0, -1), url: `${e.href}${user}.rc`, tag: e
        }));
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
            linkTag.textContent = `${link.name}/${user}.rc`;
            table.appendChild(container.querySelector('tr'));
        }
    }
} else if (paths.length === 2 && paths[0] === 'meta') {
    const params = new URLSearchParams(document.location.search);
    const file = params.get("file");

    const h1 = document.querySelector('h1');
    const list = document.querySelector('#list');
    const h1OriginalText = h1.textContent;

    async function handleViewer(url) {
        const myGridElement = document.createElement('div');
        myGridElement.id = 'myGrid';
        myGridElement.className = 'ag-theme-quartz';
        myGridElement.style.height = `${window.innerHeight * 0.8}px`;

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        document.body.append(closeButton);
        closeButton.addEventListener('click', function () {
            myGridElement.remove();
            closeButton.remove();
            list.style.display = '';
            h1.textContent = h1OriginalText;
        });
        const fileName = url.split('/').slice(-2).join('/');
        h1.textContent = `${fileName} (Preparing...)`;
        document.body.appendChild(myGridElement);
        list.style.display = 'none';

        try {
            const response = await fetch(url);
            const reader = response.body.getReader();
            const contentLength = +response.headers.get('Content-Length');

            let receivedLength = 0;
            let chunks = [];
            while (true) {
                const {done, value} = await reader.read();
                if (done) {
                    break;
                }
                chunks.push(value);
                receivedLength += value.length;
                h1.textContent = `${fileName} (${(receivedLength / contentLength * 100).toFixed(2)}% of ${Math.round(contentLength / 1024)} KB)`;
            }
            h1.textContent = `${fileName} (Processing...)`;

            const blob = new Blob(chunks);
            const dataText = await blob.text();

            let data = dataText.split('\n').slice(0, -1).map(e => e.split(/(?<!:):(?!:)/g).map(s => s.split('=')).reduce((acc, val) => val[0] !== '' ? {
                ...acc, [val[0]]: val[1].replace(/::/g, ':')
            } : acc, {}));

            let desiredOrder = ['sc', 'name', 'char', 'god', 'place', 'tmsg', 'vmsg', 'xl', 'turn', 'urune', 'end', 'v'];
            const desiredKeys = Object.keys(data[0]).filter(field => desiredOrder.includes(field));
            desiredOrder = desiredOrder.filter(key => desiredKeys.includes(key));

            const columnDefs = [{
                headerName: '#',
                valueGetter: 'node.rowIndex + 1',
                width: 80,
                suppressMenu: true,
                sortable: false,
                filter: false
            }, ...desiredOrder.map(field => {
                const isNumeric = data.every(row => !isNaN(row[field]) && row[field] !== null && row[field] !== '');
                return {
                    field: field,
                    headerName: field,
                    valueParser: isNumeric ? (params) => Number(params.newValue) : undefined,
                    comparator: isNumeric ? (valueA, valueB) => valueA - valueB : undefined,
                    filter: isNumeric ? 'agNumberColumnFilter' : 'agTextColumnFilter',
                    sortable: true,
                    resizable: true, ...(field === 'sc' ? {sort: "desc"} : {})
                };
            }), ...Object.keys(data[0]).filter(field => !desiredOrder.includes(field)).map(field => {
                const isNumeric = data.every(row => !isNaN(row[field]) && row[field] !== null && row[field] !== '');
                return {
                    field: field,
                    headerName: field,
                    valueParser: isNumeric ? (params) => Number(params.newValue) : undefined,
                    comparator: isNumeric ? (valueA, valueB) => valueA - valueB : undefined,
                    filter: isNumeric ? 'agNumberColumnFilter' : 'agTextColumnFilter',
                    sortable: true,
                    resizable: true,
                };
            })];

            const gridOptions = {
                rowData: data, columnDefs: columnDefs, defaultColDef: {
                    sortable: true, filter: true, resizable: true,
                }
            };

            agGrid.createGrid(myGridElement, gridOptions);
            h1.textContent = `${fileName}`;
        } catch (e) {
            h1.textContent = `${fileName} (error)`;
        }
    }

    (async () => {
        await loadScript('https://cdn.jsdelivr.net/npm/ag-grid-community@32.1.0/dist/ag-grid-community.min.js');
        const list = document.querySelectorAll('.link');
        for (const element of list) {
            const a = element.querySelector('a');
            if (a.getAttribute('href') === '../') {
                continue;
            }
            if (file === a.textContent) {
                handleViewer(a.href);
            }
            const viewerButton = document.createElement('button');
            viewerButton.textContent = 'Viewer (Beta)';
            viewerButton.style.marginLeft = '1em';
            viewerButton.onclick = () => handleViewer(a.href);
            element.appendChild(viewerButton);
        }
    })();
}
