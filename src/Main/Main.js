import React, { useState, useRef } from 'react';
import { getBuyableTokens, verify_sha256 } from '../utils';
import 'regenerator-runtime/runtime';
import Globe from 'react-globe.gl';
import countriesGeo from "../assets/countries.json";
import TokenModal from './TokenModal';
import clickSoundOne from '../assets/click.mp3';


export default function Main({newAction}) {
  const [nftList, setNftList] = React.useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [image, setImage] = useState(null);
  const [colors, setColors] = useState(generateRandomColors());
  const globeEl = useRef();  
  const transitionMs = 3000;
  const clickSound = new Audio(clickSoundOne);
  
  const coordList = [
    [-20.1619400, 57.4988900, "Port Louis", 0],
    [43.6529, -79.3849, "Toronto", 1],
    [49.2609, -123.1139, "Vancouver", 2],
    [-6.173292, 106.841036, "Jakarta", 3],
    [1.351616, 103.808053, "Singapore", 4],
    [13.75, 100.51667, "Bangkok", 5],
    [22.346578, 114.135442, "Hong Kong", 6],
    [3.1412000, 101.6865300, "Kuala Lumpur", 7],
    [12.97194, 77.59369, "Bangalore", 8],
    [39.905, 116.39139, "Beijing", 9],
    [51.50722, -0.1275, "London", 10],
    [47.90771, 106.88324, "Ulaanbaatar", 11],
    [-18.91368, 47.53613, "Antananarivo", 12]
  ];
  const coordListObjs = coordList.map((entry) => ({
    lat: entry[0],
    lng: entry[1],
    city: entry[2],
    index: entry[3]
  }))
  
  function changeCenter([x, y]) {
    globeEl.current.pointOfView({
      lat: x,
      lng: y,
      altitude: 2,
    }, transitionMs)
  }

  React.useEffect(async () => {    
    const urlParams = window.location.search;
    let href = window.location.href;
    href = href.slice(0, href.indexOf("?")+1);
    history.pushState(null, "Home", href + "");
    if (urlParams.includes('errorCode')) {
      newAction({
        errorMsg: "There was an error while processing the transaction!", errorMsgDesc: URLSearchParams.get('errorCode'),
      }); 
    } else if (urlParams.includes('transactionHashes')) {
      newAction({
        successMsg: "Success!", successMsgDesc: "You bought a new NFT!",
      });
    }

    const buyable = await getBuyableTokens();
    const orderedBuyable = buyable.sort(function(a, b) {
      const firstNum = a.token_id.slice(10, a.token_id.lastIndexOf("-"));
      const secondNum = b.token_id.slice(10, b.token_id.lastIndexOf("-"));
      return firstNum - secondNum;
    })
    setNftList(orderedBuyable);
  }, [])

  async function nftClicked(nftIndex) {
    if (openModal) {
      setOpenModal(false);
    }
    clickSound.play();
    setSelectedNFT(nftIndex);
    changeCenter(coordList[nftIndex]);
    loadImage(nftList[nftIndex].metadata);
    setTimeout(() => setOpenModal(true), transitionMs);
  }

  // We are prefetching the image for faster loading
  function loadImage(metadata) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "https://ipfs.io/ipfs/" + metadata.media);
    xhr.responseType = "blob";
    xhr.onload = function() {
      let blob = xhr.response;
      const reader = new FileReader();
      const verifier = new FileReader();
      reader.readAsDataURL(blob);
      
      reader.onload = async function(e) {
        const hash_correct = await verify_sha256(blob, metadata.media_hash);
        if (hash_correct) setImage(e.target.result);
        else newAction({
          errorMsg: "There was an error while loading the image!", errorMsgDesc: "The image hash is incorrect.",
        }); 
      }
    }
    xhr.send();
  }

  function generateRandomColors() {
    let tempColors = [];
    for (let i = 0; i < countriesGeo.features.length; i++) {
      tempColors[i] = Math.round(Math.random() * Math.pow(2, 24)).toString(16).padStart(6, '0');
    }
    return tempColors;
  }


  return (
    <main>
      {openModal && (
        <TokenModal 
          key={selectedNFT}
          id={nftList[selectedNFT].token_id}
          metadata={nftList[selectedNFT].metadata}
          image={image}
          newAction={newAction}
          setOpenModal={setOpenModal}
        />
      )}

      <div id="globeContainer">
        {true && <Globe 
          ref={globeEl}
          globeImageUrl={"//unpkg.com/three-globe/example/img/earth-dark.jpg"}
          hexPolygonsData={countriesGeo.features}
          hexPolygonResolution={3}
          hexPolygonMargin={0.3}
          backgroundColor={'rgba(255,255,255, 0.0)'}
          hexPolygonColor={(entry) => {
            const i = countriesGeo.features.findIndex((element) => element === entry);
            return `#${colors[i]}`
          }}
          htmlElementsData={coordListObjs}
          htmlElement={(entry) => {
            if (nftList.length > entry.index) {
              const element = document.createElement('button');
              element.classList="nftButton nftButtonGlobe"
              element.innerHTML = entry.city;
              element.style['pointer-events'] = 'auto';
              element.style.cursor = 'pointer';
              element.onclick = () => nftClicked(entry.index);
              return element;
            } 
          }}
        />}
      </div>

      <div id="nftButtonsList" className="nftButtonsList">
        {nftList.map((nft, i) => (
          <button className="nftButton" onClick={() => nftClicked(i)} >
            {nft.metadata.title}
          </button>
        ))}
      </div>

    </main>
  )
}