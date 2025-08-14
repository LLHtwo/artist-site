const albumContainer = document.getElementById('album-container');
const socialMediaLinks = document.getElementById('social-media-links');

// Fetch album data from JSON file
fetch('./assets/albums.json')
    .then(response => response.json())
    .then(data => {
        displayAlbums(data);
    })
    .catch(error => console.error('Error fetching album data:', error));

// Function to display albums on the webpage
function displayAlbums(albums) {
    albums.forEach(album => {
        const albumDiv = document.createElement('div');
        albumDiv.classList.add('album');

        const title = document.createElement('h3');
        title.textContent = album.title;

        const releaseDate = document.createElement('p');
        releaseDate.textContent = `Released on: ${album.releaseDate}`;

        const link = document.createElement('a');
        link.href = album.link;
        link.textContent = 'Listen or Purchase';
        link.target = '_blank';

        albumDiv.appendChild(title);
        albumDiv.appendChild(releaseDate);
        albumDiv.appendChild(link);
        albumContainer.appendChild(albumDiv);
    });
}

// Function to add social media links
function addSocialMediaLinks(links) {
    links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.name;
        a.target = '_blank';
        socialMediaLinks.appendChild(a);
    });
}

// Example social media links
const socialMedia = [
    { name: 'Facebook', url: 'https://facebook.com/yourprofile' },
    { name: 'Instagram', url: 'https://instagram.com/yourprofile' },
    { name: 'Twitter', url: 'https://twitter.com/yourprofile' }
];

addSocialMediaLinks(socialMedia);