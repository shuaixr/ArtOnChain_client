import { ethers } from "ethers";
import CanvasABI from "./abi/Canvas.json";

const rpcUrl =
  "https://polygon-mainnet.g.alchemy.com/v2/rHJiTkC20NBK_KPqA6LnSwLZBjL1cY42";
const contractAddress = "0x49EaCa67E130102Af4dC97FC42a307362B20C380";
const global = {
  chainId: 137,

  provider: new ethers.providers.JsonRpcProvider(rpcUrl),
  canvasContract: new ethers.Contract(contractAddress, CanvasABI),
  dataCanvasContract: new ethers.Contract(
    contractAddress,
    CanvasABI,
    new ethers.providers.JsonRpcProvider(rpcUrl)
  ),
};
export default global;
