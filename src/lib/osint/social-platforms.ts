
/**
 * Social Media & Username OSINT
 * Lista de plataformas para busca de usuários
 */

export type PlatformCategory = 'Social' | 'Dev' | 'Video' | 'Music' | 'Game' | 'Misc' | 'Msg' | 'Blog' | 'Photo';

export interface SocialPlatform {
    name: string;
    urlPattern: string;
    category: PlatformCategory;
}

export const PLATFORMS: SocialPlatform[] = [
    { name: 'Instagram', urlPattern: 'https://instagram.com/USERNAME', category: 'Social' },
    { name: 'Twitter/X', urlPattern: 'https://x.com/USERNAME', category: 'Social' },
    { name: 'Facebook', urlPattern: 'https://facebook.com/USERNAME', category: 'Social' },
    { name: 'TikTok', urlPattern: 'https://tiktok.com/@USERNAME', category: 'Social' },
    { name: 'GitHub', urlPattern: 'https://github.com/USERNAME', category: 'Dev' },
    { name: 'LinkedIn', urlPattern: 'https://www.linkedin.com/in/USERNAME', category: 'Social' },
    { name: 'Pinterest', urlPattern: 'https://pinterest.com/USERNAME', category: 'Social' },
    { name: 'Reddit', urlPattern: 'https://reddit.com/user/USERNAME', category: 'Social' },
    { name: 'Telegram', urlPattern: 'https://t.me/USERNAME', category: 'Msg' },
    { name: 'YouTube', urlPattern: 'https://youtube.com/@USERNAME', category: 'Video' },
    { name: 'Twitch', urlPattern: 'https://twitch.tv/USERNAME', category: 'Video' },
    { name: 'Steam', urlPattern: 'https://steamcommunity.com/id/USERNAME', category: 'Game' },
    { name: 'Discord (Join)', urlPattern: 'https://discord.com/invite/USERNAME', category: 'Msg' },
    { name: 'Roblox', urlPattern: 'https://www.roblox.com/user.aspx?username=USERNAME', category: 'Game' },
    { name: 'Xbox', urlPattern: 'https://xboxgamertag.com/search/USERNAME', category: 'Game' },
    { name: 'Chess.com', urlPattern: 'https://www.chess.com/member/USERNAME', category: 'Game' },
    { name: 'SoundCloud', urlPattern: 'https://soundcloud.com/USERNAME', category: 'Music' },
    { name: 'Spotify', urlPattern: 'https://open.spotify.com/user/USERNAME', category: 'Music' },
    { name: 'Last.fm', urlPattern: 'https://last.fm/user/USERNAME', category: 'Music' },
    { name: 'Medium', urlPattern: 'https://medium.com/@USERNAME', category: 'Blog' },
    { name: 'Ghost', urlPattern: 'https://USERNAME.ghost.io', category: 'Blog' },
    { name: 'WordPress', urlPattern: 'https://USERNAME.wordpress.com', category: 'Blog' },
    { name: 'Dev.to', urlPattern: 'https://dev.to/USERNAME', category: 'Dev' },
    { name: 'GitLab', urlPattern: 'https://gitlab.com/USERNAME', category: 'Dev' },
    { name: 'DockerHub', urlPattern: 'https://hub.docker.com/u/USERNAME', category: 'Dev' },
    { name: 'NPM', urlPattern: 'https://www.npmjs.com/~USERNAME', category: 'Dev' },
    { name: 'Bitbucket', urlPattern: 'https://bitbucket.org/USERNAME', category: 'Dev' },
    { name: 'Vimeo', urlPattern: 'https://vimeo.com/USERNAME', category: 'Video' },
    { name: 'Flickr', urlPattern: 'https://flickr.com/people/USERNAME', category: 'Photo' },
    { name: 'Behance', urlPattern: 'https://behance.net/USERNAME', category: 'Photo' },
    { name: 'Dribbble', urlPattern: 'https://dribbble.com/USERNAME', category: 'Photo' },
    { name: 'Unsplash', urlPattern: 'https://unsplash.com/@USERNAME', category: 'Photo' },
    { name: 'Wikipedia', urlPattern: 'https://en.wikipedia.org/wiki/User:USERNAME', category: 'Misc' },
    { name: 'Pastebin', urlPattern: 'https://pastebin.com/u/USERNAME', category: 'Misc' },
    { name: 'Gravatar', urlPattern: 'https://en.gravatar.com/USERNAME', category: 'Misc' },
    { name: 'About.me', urlPattern: 'https://about.me/USERNAME', category: 'Social' },
    { name: 'Keybase', urlPattern: 'https://keybase.io/USERNAME', category: 'Misc' },
    { name: 'Linktree', urlPattern: 'https://linktr.ee/USERNAME', category: 'Misc' },
    { name: 'BuyMeACoffee', urlPattern: 'https://buymeacoffee.com/USERNAME', category: 'Misc' },
    { name: 'Patreon', urlPattern: 'https://patreon.com/USERNAME', category: 'Misc' },
    { name: 'Wattpad', urlPattern: 'https://wattpad.com/user/USERNAME', category: 'Blog' },
    { name: 'Letterboxd', urlPattern: 'https://letterboxd.com/USERNAME', category: 'Video' },
    { name: 'MyAnimeList', urlPattern: 'https://myanimelist.net/profile/USERNAME', category: 'Misc' },
    { name: 'Quora', urlPattern: 'https://quora.com/profile/USERNAME', category: 'Social' },
    { name: 'Jusbrasil', urlPattern: 'https://www.jusbrasil.com.br/busca?q=USERNAME', category: 'Misc' },
    { name: 'Substack', urlPattern: 'https://USERNAME.substack.com', category: 'Blog' },
];

export function generateProfileLinks(username: string): Array<SocialPlatform & { link: string }> {
    if (!username) return [];
    const cleanUser = encodeURIComponent(username.trim());
    return PLATFORMS.map(p => ({
        ...p,
        link: p.urlPattern.replace('USERNAME', cleanUser)
    }));
}
