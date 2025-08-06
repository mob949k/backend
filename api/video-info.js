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
        const { url } = req.body;

        if (!url || !ytdl.validateURL(url)) {
            return res.status(400).json({
                success: false,
                error: 'URL de YouTube inválida'
            });
        }

        const info = await ytdl.getInfo(url);
        const videoDetails = info.videoDetails;

        // Obtener formatos disponibles
        const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

        const availableQualities = [...new Set(formats.map(f => f.qualityLabel).filter(q => q))];

        res.json({
            success: true,
            video: {
                title: videoDetails.title,
                thumbnail: videoDetails.thumbnails[0]?.url,
                duration: formatDuration(videoDetails.lengthSeconds),
                author: videoDetails.author.name,
                viewCount: parseInt(videoDetails.viewCount).toLocaleString(),
                uploadDate: new Date(videoDetails.publishDate).toLocaleDateString('es-ES'),
                qualities: availableQualities,
                hasAudio: audioFormats.length > 0
            }
        });
    } catch (error) {
        console.error('Error obteniendo info del video:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener información del video'
        });
    }
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}