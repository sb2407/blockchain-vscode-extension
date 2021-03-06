/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

import * as vscode from 'vscode';
import { FabricGatewayRegistry } from '../../src/fabric/FabricGatewayRegistry';
import { FabricRuntimeManager } from '../../src/fabric/FabricRuntimeManager';
import { ExtensionUtil } from '../../src/util/ExtensionUtil';
import { FabricRuntime } from '../../src/fabric/FabricRuntime';
import { VSCodeBlockchainOutputAdapter } from '../../src/logging/VSCodeBlockchainOutputAdapter';
import { TestUtil } from '../TestUtil';
import * as chai from 'chai';
import * as sinon from 'sinon';
import { ExtensionCommands } from '../../ExtensionCommands';
import { LogType } from '../../src/logging/OutputAdapter';
import { FabricConnectionManager } from '../../src/fabric/FabricConnectionManager';
import { FabricGatewayRegistryEntry } from '../../src/fabric/FabricGatewayRegistryEntry';
import { FabricRuntimeUtil } from '../../src/fabric/FabricRuntimeUtil';
import { FabricEnvironmentRegistryEntry } from '../../src/fabric/FabricEnvironmentRegistryEntry';
import { FabricEnvironmentManager } from '../../src/fabric/FabricEnvironmentManager';
chai.should();

// tslint:disable no-unused-expression
describe('restartFabricRuntime', () => {

    const sandbox: sinon.SinonSandbox = sinon.createSandbox();
    const connectionRegistry: FabricGatewayRegistry = FabricGatewayRegistry.instance();
    const runtimeManager: FabricRuntimeManager = FabricRuntimeManager.instance();
    let logSpy: sinon.SinonSpy;
    let runtime: FabricRuntime;
    let executeCommandSpy: sinon.SinonSpy;

    before(async () => {
        await TestUtil.setupTests(sandbox);
        await TestUtil.storeGatewaysConfig();
        await TestUtil.storeRuntimesConfig();
    });

    after(async () => {
        await TestUtil.restoreGatewaysConfig();
        await TestUtil.restoreRuntimesConfig();
    });

    beforeEach(async () => {
        await ExtensionUtil.activateExtension();
        await connectionRegistry.clear();
        await runtimeManager.initialize();
        runtime = runtimeManager.getRuntime();
        logSpy = sandbox.spy(VSCodeBlockchainOutputAdapter.instance(), 'log');
        executeCommandSpy = sandbox.spy(vscode.commands, 'executeCommand');
    });

    afterEach(async () => {
        sandbox.restore();
        await connectionRegistry.clear();
    });

    it('should restart a Fabric runtime', async () => {
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
        executeCommandSpy.should.not.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
    });

    it('should disconnect from gateway if connected and then restart a Fabric runtime', async () => {
        const gatewayRegistryEntry: FabricGatewayRegistryEntry = new FabricGatewayRegistryEntry();
        gatewayRegistryEntry.name = FabricRuntimeUtil.name;
        gatewayRegistryEntry.managedRuntime = true;
        sandbox.stub(FabricConnectionManager.instance(), 'getGatewayRegistryEntry').returns(gatewayRegistryEntry);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_GATEWAY);
    });

    it('should disconnect from environment if connected and then restart a Fabric runtime', async () => {
        const environmentRegistryEntry: FabricEnvironmentRegistryEntry = new FabricEnvironmentRegistryEntry();
        environmentRegistryEntry.name = FabricRuntimeUtil.name;
        environmentRegistryEntry.managedRuntime = true;
        sandbox.stub(FabricEnvironmentManager.instance(), 'getEnvironmentRegistryEntry').returns(environmentRegistryEntry);
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').resolves();
        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.should.have.been.calledOnceWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
        executeCommandSpy.should.have.been.calledWith(ExtensionCommands.DISCONNECT_ENVIRONMENT);
    });

    it('should display an error if restarting Fabric runtime fails', async () => {
        const error: Error = new Error('something terrible is about to happen');
        const restartStub: sinon.SinonStub = sandbox.stub(runtime, 'restart').rejects(error);
        await vscode.commands.executeCommand(ExtensionCommands.RESTART_FABRIC);
        restartStub.should.have.been.called.calledOnceWithExactly(VSCodeBlockchainOutputAdapter.instance());
        logSpy.getCall(0).should.have.been.calledWithExactly(LogType.INFO, undefined, 'restartFabricRuntime');
        logSpy.getCall(1).should.have.been.calledWithExactly(LogType.ERROR, `Failed to restart Local Fabric: ${error.message}`, `Failed to restart Local Fabric: ${error.toString()}`);
    });
});
