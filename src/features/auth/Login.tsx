import { useState, type FormEvent } from 'react';
import { ArrowRight, CarFront, Check, Eye, EyeOff, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react';
import type { User } from '../../../shared/types';
import { ErrorBox } from '../../components';
import { api, errorMessage, useQuery } from '../../lib';
import Brand from '../../layout/Brand';

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const config = useQuery<{ demo: boolean }>('/login-info', 0);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api<User>('/login', 'POST', { username, password }));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div className="login-message">
          <span className="eyebrow">
            <span /> FACULTAD DE ESTUDIOS SUPERIORES ARAGÓN
          </span>
          <h1>
            Un campus
            <br />
            en movimiento.
            <br />
            <em>Todo bajo control.</em>
          </h1>
          <p>Una visión compartida de los accesos, el transporte y la seguridad de nuestra comunidad.</p>
          <div className="campus-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="campus-road" />
            <div className="campus-building">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="art-label art-label-a">
              <CarFront size={18} />
              <span>Accesos conectados</span>
              <i />
            </div>
            <div className="art-label art-label-b">
              <ShieldCheck size={18} />
              <span>Campus seguro</span>
              <Check size={14} />
            </div>
            <div className="art-pin">
              <MapPin size={22} />
            </div>
          </div>
        </div>
        <span className="login-bottom">
          UNAM · FES ARAGÓN <span>Proyecto académico</span>
        </span>
      </div>
      <div className="login-form-side">
        <span className="login-top-note">
          <LockKeyhole size={14} /> Acceso para personal autorizado
        </span>
        <form onSubmit={submit} className="login-form">
          <span className="eyebrow dark">BIENVENIDO A MOVILIDAD</span>
          <h2>Tu campus, al día.</h2>
          <p>
            Inicia sesión para consultar y gestionar
            <br className="desktop-only" /> la actividad vehicular de la Facultad.
          </p>
          <ErrorBox message={error} />
          <label>
            Usuario
            <input
              autoFocus
              name="username"
              autoComplete="username"
              required
              placeholder="Escribe tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <div className="password-field">
              <input
                name="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Escribe tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button className="button primary login-submit" disabled={busy}>
            {busy ? 'Iniciando sesión…' : 'Entrar al sistema'}
            <ArrowRight size={18} />
          </button>
          {config.data?.demo && (
            <div className="demo-access">
              <span>EXPLORA LA DEMOSTRACIÓN</span>
              <p>Elige un perfil para completar las credenciales.</p>
              <div>
                {[
                  ['admin', 'Administrador'],
                  ['seguridad', 'Seguridad'],
                  ['direccion', 'Directivo'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setUsername(value);
                      setPassword('Aragon2026!');
                      setError('');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <small>
                Datos ficticios · Contraseña: <code>Aragon2026!</code>
              </small>
            </div>
          )}
        </form>
        <span className="login-privacy">
          Solo se registra información necesaria para la operación vehicular.
        </span>
      </div>
    </div>
  );
}

