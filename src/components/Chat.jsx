import { useState, useRef, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import { renderMarkdown } from '../utils/markdownRenderer';
import './Chat.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const PRICE_PER_MESSAGE = 1000;
const TOKEN_MINT = 'DXgxW5ESEpvTA194VJZRxwXADRuZKPoeadLoK7o5pump';
const TOKEN_DECIMALS = 6;

function Chat() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !connected || !publicKey) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10)
        })
      });

      if (response.status === 402) {
        if (!signTransaction || !connection) {
          throw new Error('Wallet or connection not ready for payment');
        }

        const paymentInfo = await response.json();
        console.log('Payment info:', paymentInfo);

        try {
          const payment = paymentInfo.payment;
          if (!payment || !payment.recipient || !payment.amount) {
            throw new Error('Invalid payment info from server');
          }

          let recipientPubkey;
          try {
            recipientPubkey = new PublicKey(payment.recipient);
          } catch (e) {
            console.error('Invalid recipient address:', payment.recipient);
            throw new Error(`Invalid recipient address: ${payment.recipient}`);
          }

          const mintPubkey = new PublicKey(TOKEN_MINT);

          const fromTokenAccount = await getAssociatedTokenAddress(
            mintPubkey,
            publicKey
          );

          const toTokenAccount = await getAssociatedTokenAddress(
            mintPubkey,
            recipientPubkey
          );

          const blockData = await connection.getLatestBlockhash('finalized');
          const { blockhash, lastValidBlockHeight } = blockData;

          const tx = new Transaction({
            blockhash,
            lastValidBlockHeight,
            feePayer: publicKey
          });

          const tokenAmount = Math.floor(parseFloat(payment.amount) * Math.pow(10, TOKEN_DECIMALS));

          tx.add(
            createTransferInstruction(
              fromTokenAccount,
              toTokenAccount,
              publicKey,
              tokenAmount
            )
          );

          const signedTx = await signTransaction(tx);
          const rawTx = signedTx.serialize();
          const signature = await connection.sendRawTransaction(rawTx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });

          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
          }, 'confirmed');

          const paymentPayload = {
            spl402Version: 1,
            scheme: 'token-transfer',
            network: payment.network || 'mainnet-beta',
            mint: TOKEN_MINT,
            decimals: TOKEN_DECIMALS,
            payload: {
              from: publicKey.toString(),
              to: recipientPubkey.toString(),
              amount: payment.amount,
              signature: signature,
              timestamp: Date.now()
            }
          };

          const retryResponse = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Payment': JSON.stringify(paymentPayload)
            },
            body: JSON.stringify({
              message: userMessage,
              history: messages.slice(-10)
            })
          });

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            setTotalSpent(prev => prev + PRICE_PER_MESSAGE);
          } else {
            throw new Error('Payment verified but request failed');
          }
        } catch (paymentError) {
          console.error('Payment error details:', paymentError);
          throw new Error(`Payment failed: ${paymentError.message}`);
        }
      } else if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        setTotalSpent(prev => prev + PRICE_PER_MESSAGE);
      } else {
        throw new Error('Request failed');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'system', content: `Error: ${error.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-content">
          <h1>[GPT402] Powered by spl402</h1>
          <p className="tagline">Pay per message • No signup • No subscription</p>
          <div className="pricing">
            <span className="price">{PRICE_PER_MESSAGE.toLocaleString()} SPL402 per message</span>
            <span className="total">Spent: {totalSpent.toLocaleString()} SPL402</span>
          </div>
        </div>

        <div className="desktop-buttons">
          <a
            href="https://pump.fun/coin/DXgxW5ESEpvTA194VJZRxwXADRuZKPoeadLoK7o5pump"
            target="_blank"
            rel="noopener noreferrer"
            className="buy-button"
          >
            Buy SPL402
          </a>
          <WalletMultiButton />
        </div>

        <button
          className="hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>

      {mobileMenuOpen && (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="mobile-menu">
            <button
              className="mobile-menu-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
            <a
              href="https://pump.fun/coin/DXgxW5ESEpvTA194VJZRxwXADRuZKPoeadLoK7o5pump"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(false)}
            >
              Buy SPL402
            </a>
            <div className="mobile-wallet-button">
              <WalletMultiButton />
            </div>
          </div>
        </>
      )}

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome">
            <h2>Welcome to the future of AI payments</h2>
            <p>Connect your wallet and start chatting</p>
            <p>Each message costs just {PRICE_PER_MESSAGE.toLocaleString()} SPL402</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant loading">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={connected ? "Type your message..." : "Connect wallet to chat"}
          disabled={!connected || loading}
        />
        <button
          onClick={sendMessage}
          disabled={!connected || !publicKey || !input.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;