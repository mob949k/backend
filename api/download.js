const ytdl = require('ytdl-core');

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { url, quality, format } = req.body;

        if (!url || !ytdl.validateURL(url)) {
            return res.status(400).json({
                success: false,
                error: 'URL de YouTube inválida'
            });
        }

        const info = await ytdl.getInfo(url);
        const videoDetails = info.videoDetails;

        // Limpiar título para nombre de archivo
        const safeTitle = videoDetails.title
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100);

        let filename;
        let downloadOptions = {};
        let contentType;

        if (format === 'audio') {
            filename = `${safeTitle}.mp4`;
            contentType = 'audio/mp4';
            downloadOptions = {
                filter: 'audioonly',
                quality: 'highestaudio'
            };
        } else {
            filename = `${safeTitle}.mp4`;
            contentType = 'video/mp4';

            if (quality === 'best') {
                downloadOptions = {
                    filter: 'videoandaudio',
                    quality: 'highest'
                };
            } else {
                downloadOptions = {
                    filter: format => format.container === 'mp4' && format.hasVideo && format.hasAudio,
                    quality: quality || 'highest'
                };
            }
        }

        // Configurar headers para descarga
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', contentType);

        // Crear stream de descarga
        const videoStream = ytdl(url, downloadOptions);

        // Manejar eventos del stream
        videoStream.on('error', (error) => {
            console.error('Error en el stream:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Error durante la descarga'
                });
            }
        });

        // Enviar el stream directamente al cliente
        videoStream.pipe(res);

    } catch (error) {
        console.error('Error descargando video:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Error al descargar el video: ' + error.message
            });
        }
    }
}