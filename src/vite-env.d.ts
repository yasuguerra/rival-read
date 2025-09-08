/// <reference types="vite/client" />

// Vite allows importing assets as URLs via ?url
declare module '*?url' {
	const url: string;
	export default url;
}
