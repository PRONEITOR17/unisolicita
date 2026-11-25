'use strict';
const { obtenerEstado, ESTADOS } = require('../src/domain/estados');
const { Solicitud, Usuario } = require('../src/domain/models');
const { AccesoDenegadoError, ReglaNegocioError, ValidationError } = require('../src/errors');

const usuario = (id, rol) => new Usuario({ id_usuario: id, rol, nombre: `U${id}`, activo: true });
const admin = usuario(1, 'ADMINISTRADOR');
const estudiante = usuario(2, 'ESTUDIANTE');
const responsable = usuario(3, 'FUNCIONARIO');
const otroFuncionario = usuario(4, 'FUNCIONARIO');

const solicitud = (estado, extra = {}) =>
  new Solicitud({
    id_solicitud: 10,
    codigo: 'SOL-2026-00010',
    id_solicitante: 2,
    id_responsable: 3,
    estado,
    prioridad: 'MEDIA',
    ...extra,
  });

const destinos = (estado) => obtenerEstado(estado).transiciones().map((t) => t.hacia);

describe('Patrón State · transiciones permitidas (RN09)', () => {
  test.each([
    ['REGISTRADA', ['ASIGNADA', 'RECHAZADA']],
    ['ASIGNADA', ['EN_PROCESO', 'RECHAZADA']],
    ['EN_PROCESO', ['RESUELTA']],
    ['RESUELTA', ['CERRADA']],
    ['CERRADA', ['REABIERTA']],
    ['REABIERTA', ['EN_PROCESO']],
    ['RECHAZADA', []],
  ])('%s solo puede pasar a %j', (estado, esperados) => {
    expect(destinos(estado).sort()).toEqual([...esperados].sort());
  });

  test('RECHAZADA es un estado final', () => {
    expect(obtenerEstado('RECHAZADA').esFinal()).toBe(true);
    expect(obtenerEstado('REGISTRADA').esFinal()).toBe(false);
  });

  test('hay un objeto State por cada estado del ciclo de vida', () => {
    expect(ESTADOS.map((e) => e.nombre).sort()).toEqual(
      ['ASIGNADA', 'CERRADA', 'EN_PROCESO', 'REABIERTA', 'REGISTRADA', 'RECHAZADA', 'RESUELTA'].sort(),
    );
  });

  test('solo se reasigna en ASIGNADA, EN_PROCESO y REABIERTA', () => {
    const permitidos = ESTADOS.filter((e) => e.permiteReasignar()).map((e) => e.nombre);
    expect(permitidos.sort()).toEqual(['ASIGNADA', 'EN_PROCESO', 'REABIERTA']);
  });

  test('solo se agregan observaciones en EN_PROCESO', () => {
    const permitidos = ESTADOS.filter((e) => e.permiteObservacion()).map((e) => e.nombre);
    expect(permitidos).toEqual(['EN_PROCESO']);
  });
});

describe('Solicitud · validación de transiciones (RN05, RN09, RN11)', () => {
  test('rechaza una transición que no existe', () => {
    expect(() => solicitud('REGISTRADA').validarTransicion('RESUELTA', admin, 'x')).toThrow(ReglaNegocioError);
    expect(() => solicitud('CERRADA').validarTransicion('EN_PROCESO', admin, 'x')).toThrow(ReglaNegocioError);
  });

  test('exige la solución para pasar a RESUELTA', () => {
    const s = solicitud('EN_PROCESO');
    expect(() => s.validarTransicion('RESUELTA', responsable, '')).toThrow(ValidationError);
    expect(() => s.validarTransicion('RESUELTA', responsable, '   ')).toThrow(ValidationError);
    expect(s.validarTransicion('RESUELTA', responsable, 'Listo').hacia).toBe('RESUELTA');
  });

  test('exige motivo para rechazar y para reabrir', () => {
    expect(() => solicitud('REGISTRADA').validarTransicion('RECHAZADA', admin, '')).toThrow(ValidationError);
    expect(() => solicitud('CERRADA').validarTransicion('REABIERTA', admin, '')).toThrow(ValidationError);
  });

  test('un funcionario que no es el responsable no puede cambiar el estado', () => {
    expect(() => solicitud('ASIGNADA').validarTransicion('EN_PROCESO', otroFuncionario, '')).toThrow(AccesoDenegadoError);
    expect(solicitud('ASIGNADA').validarTransicion('EN_PROCESO', responsable, '').hacia).toBe('EN_PROCESO');
  });

  test('el estudiante nunca puede cambiar el estado', () => {
    expect(() => solicitud('ASIGNADA').validarTransicion('EN_PROCESO', estudiante, '')).toThrow(AccesoDenegadoError);
  });

  test('solo el administrador reabre una solicitud cerrada', () => {
    expect(() => solicitud('CERRADA').validarTransicion('REABIERTA', responsable, 'motivo')).toThrow(AccesoDenegadoError);
    expect(solicitud('CERRADA').validarTransicion('REABIERTA', admin, 'motivo').hacia).toBe('REABIERTA');
  });
});

describe('Solicitud · visibilidad y permisos (RN08)', () => {
  test('cada rol ve lo que le corresponde', () => {
    const s = solicitud('ASIGNADA');
    expect(s.puedeVer(admin)).toBe(true);
    expect(s.puedeVer(usuario(9, 'SUPERVISOR'))).toBe(true);
    expect(s.puedeVer(estudiante)).toBe(true);
    expect(s.puedeVer(usuario(8, 'ESTUDIANTE'))).toBe(false);
    expect(s.puedeVer(responsable)).toBe(true);
    expect(s.puedeVer(otroFuncionario)).toBe(false);
  });

  test('solo el administrador asigna, y únicamente en estados que lo permiten', () => {
    expect(solicitud('REGISTRADA').puedeAsignar(admin)).toBe(true);
    expect(solicitud('EN_PROCESO').puedeAsignar(admin)).toBe(true);
    expect(solicitud('RESUELTA').puedeAsignar(admin)).toBe(false);
    expect(solicitud('REGISTRADA').puedeAsignar(responsable)).toBe(false);
  });
});
