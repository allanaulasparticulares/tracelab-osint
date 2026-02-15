
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
    { name: 'Roblox', urlPattern: 'https://www.roblox.com/user.aspx?username=USERNAME', category: 'Game' },
    { name: 'SoundCloud', urlPattern: 'https://soundcloud.com/USERNAME', category: 'Music' },
    { name: 'Spotify', urlPattern: 'https://open.spotify.com/user/USERNAME', category: 'Music' },
    { name: 'Medium', urlPattern: 'https://medium.com/@USERNAME', category: 'Blog' },
    { name: 'Dev.to', urlPattern: 'https://dev.to/USERNAME', category: 'Dev' },
    { name: 'GitLab', urlPattern: 'https://gitlab.com/USERNAME', category: 'Dev' },
    { name: 'DockerHub', urlPattern: 'https://hub.docker.com/u/USERNAME', category: 'Dev' },
    { name: 'NPM', urlPattern: 'https://www.npmjs.com/~USERNAME', category: 'Dev' },
    { name: 'Vimeo', urlPattern: 'https://vimeo.com/USERNAME', category: 'Video' },
    { name: 'Flickr', urlPattern: 'https://flickr.com/people/USERNAME', category: 'Photo' },
    { name: 'Wikipedia', urlPattern: 'https://en.wikipedia.org/wiki/User:USERNAME', category: 'Misc' },
    { name: 'Pastebin', urlPattern: 'https://pastebin.com/u/USERNAME', category: 'Misc' },
    { name: 'Gravatar', urlPattern: 'https://en.gravatar.com/USERNAME', category: 'Misc' },
    { name: 'About.me', urlPattern: 'https://about.me/USERNAME', category: 'Social' },
    { name: 'Keybase', urlPattern: 'https://keybase.io/USERNAME', category: 'Misc' },
    { name: 'Linktree', urlPattern: 'https://linktr.ee/USERNAME', category: 'Misc' },
    { name: 'BuyMeACoffee', urlPattern: 'https://buymeacoffee.com/USERNAME', category: 'Misc' },
    { name: 'Patreon', urlPattern: 'https://patreon.com/USERNAME', category: 'Misc' },
];

export function generateProfileLinks(username: string): Array<SocialPlatform & { link: string }> {
    if (!username) return [];
    const cleanUser = encodeURIComponent(username.trim());
    return PLATFORMS.map(p => ({
        ...p,
        link: p.urlPattern.replace('USERNAME', cleanUser)
    }));
}
